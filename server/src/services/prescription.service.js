import { mkdir, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { query, transaction } from "../config/db.js";

const storageDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../uploads/private-prescriptions",
);

const fileTypes = new Map([
  ["application/pdf", { extension: ".pdf", signature: (buffer) => buffer.subarray(0, 5).toString() === "%PDF-" }],
  ["image/jpeg", { extension: ".jpg", signature: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff }],
  ["image/png", { extension: ".png", signature: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) }],
  ["image/webp", { extension: ".webp", signature: (buffer) => buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP" }],
]);

export function validatePrescriptionFile(file) {
  const fileType = fileTypes.get(file.mimetype);
  if (!fileType || !fileType.signature(file.buffer)) {
    const error = new Error("Upload a valid PDF, JPEG, PNG, or WebP prescription file.");
    error.statusCode = 400;
    throw error;
  }
  return fileType;
}

function safeOriginalName(name) {
  const normalized = name.replace(/^.*[\\/]/, "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return normalized.slice(0, 255) || "prescription";
}

export async function createPrescriptionRequest({
  userId,
  requestType,
  medicineName,
  message,
  file,
}) {
  const name = typeof medicineName === "string" ? medicineName.trim() : "";
  const details = typeof message === "string" ? message.trim() : "";
  if (!["prescription", "price"].includes(requestType)) {
    const error = new Error("Request type must be prescription or price.");
    error.statusCode = 400;
    throw error;
  }
  if (!name || name.length > 255 || !details || details.length > 5000) {
    const error = new Error("Medicine details and a message are required; maximum lengths are 255 and 5000 characters.");
    error.statusCode = 400;
    throw error;
  }
  if (file && requestType === "price") {
    const error = new Error("Prescription files are only accepted for prescription clarification requests.");
    error.statusCode = 400;
    throw error;
  }

  let fileKey;
  let fileType;
  let fileName;
  if (file) {
    fileType = validatePrescriptionFile(file);
    fileKey = randomUUID();
    fileName = safeOriginalName(file.originalname);
    await mkdir(storageDirectory, { recursive: true });
    await writeFile(
      path.join(storageDirectory, `${fileKey}${fileType.extension}`),
      file.buffer,
      { flag: "wx", mode: 0o600 },
    );
  }

  try {
    const result = await query(
      `INSERT INTO prescription_requests (
         user_id, request_type, medicine_name, message,
         file_key, file_name, file_mime_type, file_size
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, request_type, medicine_name, message, status, created_at,
         (file_key IS NOT NULL) AS has_file`,
      [
        userId,
        requestType,
        name,
        details,
        fileKey || null,
        fileName || null,
        file ? file.mimetype : null,
        file ? file.size : null,
      ],
    );
    return result.rows[0];
  } catch (error) {
    if (fileKey) {
      try {
        await unlink(path.join(storageDirectory, `${fileKey}${fileType.extension}`));
      } catch (cleanupError) {
        console.error("Could not remove an orphaned private upload:", cleanupError);
      }
    }
    throw error;
  }
}

export async function listPatientRequests(userId) {
  const result = await query(
    `SELECT id, request_type, medicine_name, message, status, admin_reply,
       replied_at, created_at, (file_key IS NOT NULL) AS has_file
     FROM prescription_requests
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function getPatientRequestFile(userId, requestId) {
  const result = await query(
    `SELECT file_key, file_name, file_mime_type
     FROM prescription_requests
     WHERE id = $1 AND user_id = $2 AND file_key IS NOT NULL`,
    [requestId, userId],
  );
  const record = result.rows[0];
  if (!record) {
    return null;
  }
  const fileType = fileTypes.get(record.file_mime_type);
  if (!fileType) {
    throw new Error("The stored file type is not supported.");
  }
  return {
    path: path.join(storageDirectory, `${record.file_key}${fileType.extension}`),
    mimeType: record.file_mime_type,
    fileName: `hti-prescription${fileType.extension}`,
  };
}

export async function listAdminPrescriptionRequests() {
  const result = await query(
    `SELECT r.id, r.request_type, r.medicine_name, r.message, r.status,
       r.admin_reply, r.created_at, r.replied_at, r.file_name,
       (r.file_key IS NOT NULL) AS has_file,
       u.full_name AS patient_name, u.email AS patient_email,
       COALESCE((
         SELECT json_agg(json_build_object(
           'doctor_user_id', doc.id,
           'full_name', doc.full_name,
           'granted_at', g.granted_at
         ) ORDER BY doc.full_name)
         FROM prescription_access_grants g
         JOIN users doc ON doc.id = g.doctor_user_id
         WHERE g.prescription_request_id = r.id
       ), '[]'::json) AS shared_doctors
     FROM prescription_requests r
     JOIN users u ON u.id = r.user_id
     ORDER BY r.created_at DESC`,
  );
  return result.rows;
}

export async function getAdminRequestFile(requestId) {
  const result = await query(
    `SELECT file_key, file_name, file_mime_type
     FROM prescription_requests
     WHERE id = $1 AND file_key IS NOT NULL`,
    [requestId],
  );
  const record = result.rows[0];
  if (!record) {
    return null;
  }
  const fileType = fileTypes.get(record.file_mime_type);
  if (!fileType) {
    throw new Error("The stored file type is not supported.");
  }
  return {
    path: path.join(storageDirectory, `${record.file_key}${fileType.extension}`),
    mimeType: record.file_mime_type,
    fileName: `hti-prescription${fileType.extension}`,
  };
}

export async function listVerifiedDoctorsForPrescriptionAccess() {
  const result = await query(
    `SELECT u.id AS doctor_user_id, u.full_name, u.email, d.specialization
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     WHERE d.application_status = 'approved'
       AND d.verification_status = 'verified'
       AND u.role = 'DOCTOR'
       AND u.account_status = 'active'
     ORDER BY u.full_name`,
  );
  return result.rows;
}

export async function setPrescriptionDoctorAccess({ requestId, doctorUserId, adminId, granted }) {
  return transaction(async (client) => {
    const requestRow = await client.query(
      "SELECT id, user_id, medicine_name FROM prescription_requests WHERE id = $1",
      [requestId],
    );
    if (!requestRow.rows[0]) return null;

    if (granted) {
      const doctor = await client.query(
        `SELECT u.id FROM users u
         JOIN doctors d ON d.user_id = u.id
         WHERE u.id = $1 AND u.role = 'DOCTOR' AND u.account_status = 'active'
           AND d.application_status = 'approved' AND d.verification_status = 'verified'`,
        [doctorUserId],
      );
      if (!doctor.rows[0]) {
        const error = new Error("Select an active, verified doctor.");
        error.statusCode = 400;
        throw error;
      }
      await client.query(
        `INSERT INTO prescription_access_grants (prescription_request_id, doctor_user_id, granted_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (prescription_request_id, doctor_user_id)
         DO UPDATE SET granted_by = EXCLUDED.granted_by, granted_at = NOW()`,
        [requestId, doctorUserId, adminId],
      );
      await client.query(
        `INSERT INTO notifications (user_id, notification_type, message)
         VALUES ($1, 'prescription_access', $2)`,
        [doctorUserId, `Admin shared prescription request #${requestId} (${requestRow.rows[0].medicine_name}) with you.`],
      );
    } else {
      await client.query(
        `DELETE FROM prescription_access_grants
         WHERE prescription_request_id = $1 AND doctor_user_id = $2`,
        [requestId, doctorUserId],
      );
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, 'prescription_request', $3, $4::jsonb)`,
      [
        adminId,
        granted ? "prescription.access.grant" : "prescription.access.revoke",
        requestId,
        JSON.stringify({ doctorUserId }),
      ],
    );
    return { requestId, doctorUserId, granted };
  });
}

export async function listDoctorGrantedPrescriptions(doctorUserId) {
  const result = await query(
    `SELECT r.id, r.request_type, r.medicine_name, r.message, r.status,
       r.admin_reply, r.created_at, (r.file_key IS NOT NULL) AS has_file,
       u.full_name AS patient_name, g.granted_at
     FROM prescription_requests r
     JOIN prescription_access_grants g
       ON g.prescription_request_id = r.id AND g.doctor_user_id = $1
     JOIN users u ON u.id = r.user_id
     ORDER BY g.granted_at DESC, r.created_at DESC`,
    [doctorUserId],
  );
  return result.rows;
}

export async function getDoctorRequestFile(doctorUserId, requestId) {
  const result = await query(
    `SELECT r.file_key, r.file_name, r.file_mime_type
     FROM prescription_requests r
     JOIN prescription_access_grants g
       ON g.prescription_request_id = r.id AND g.doctor_user_id = $1
     WHERE r.id = $2 AND r.file_key IS NOT NULL`,
    [doctorUserId, requestId],
  );
  const record = result.rows[0];
  if (!record) {
    return null;
  }
  const fileType = fileTypes.get(record.file_mime_type);
  if (!fileType) {
    throw new Error("The stored file type is not supported.");
  }
  return {
    path: path.join(storageDirectory, `${record.file_key}${fileType.extension}`),
    mimeType: record.file_mime_type,
    fileName: `hti-prescription${fileType.extension}`,
  };
}

export async function replyToPrescriptionRequest({ requestId, adminId, reply }) {
  const text = typeof reply === "string" ? reply.trim() : "";
  if (!text || text.length > 5000) {
    const error = new Error("Reply is required and must be 5000 characters or fewer.");
    error.statusCode = 400;
    throw error;
  }
  return transaction(async (client) => {
    const updated = await client.query(
      `UPDATE prescription_requests
       SET admin_reply = $2, status = 'replied', replied_by = $3,
           replied_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING id, user_id, status, replied_at`,
      [requestId, text, adminId],
    );
    const request = updated.rows[0];
    if (!request) {
      return null;
    }
    await client.query(
      `INSERT INTO notifications (user_id, notification_type, message)
       VALUES ($1, 'prescription_reply', $2)`,
      [request.user_id, `A reply is available for request ${request.id}.`],
    );
    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id)
       VALUES ($1, 'prescription.reply', 'prescription_request', $2)`,
      [adminId, request.id],
    );
    return request;
  });
}

export async function updatePrescriptionStatus({ requestId, adminId, status }) {
  if (!["reviewing", "closed"].includes(status)) {
    const error = new Error("Status must be reviewing or closed.");
    error.statusCode = 400;
    throw error;
  }
  return transaction(async (client) => {
    const updated = await client.query(
      `UPDATE prescription_requests SET status = $2, updated_at = NOW()
       WHERE id = $1 RETURNING id, user_id, status`,
      [requestId, status],
    );
    const request = updated.rows[0];
    if (!request) {
      return null;
    }
    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id)
       VALUES ($1, 'prescription.status', 'prescription_request', $2)`,
      [adminId, request.id],
    );
    return request;
  });
}

export async function deletePrescriptionRequest({ requestId, adminId }) {
  const deleted = await transaction(async (client) => {
    const result = await client.query(
      `DELETE FROM prescription_requests
       WHERE id = $1
       RETURNING id, file_key, file_mime_type`,
      [requestId],
    );
    const row = result.rows[0];
    if (!row) return null;
    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id)
       VALUES ($1, 'prescription.delete', 'prescription_request', $2)`,
      [adminId, row.id],
    );
    return row;
  });

  if (deleted?.file_key) {
    const fileType = fileTypes.get(deleted.file_mime_type);
    if (fileType) {
      try {
        await unlink(path.join(storageDirectory, `${deleted.file_key}${fileType.extension}`));
      } catch (err) {
        if (err?.code !== "ENOENT") {
          console.error("Could not delete prescription file:", err);
        }
      }
    }
  }
  return deleted;
}