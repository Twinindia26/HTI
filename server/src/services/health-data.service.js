import { unlink } from "node:fs/promises";
import { query, transaction } from "../config/db.js";
import {
  getPrivateHealthRecordPath,
  safePrivateFileName,
  storePrivateHealthRecord,
  validateHealthRecordFile,
} from "./private-file.service.js";

const vitalUnits = {
  heart_rate: ["bpm"],
  blood_pressure: ["mmHg"],
  spo2: ["%"],
  temperature: ["C", "F"],
  weight: ["kg", "lb"],
  height: ["cm", "in"],
  glucose: ["mg/dL", "mmol/L"],
};

const vitalRanges = {
  heart_rate: [20, 300],
  blood_pressure: [40, 300],
  spo2: [50, 100],
  temperature: { C: [25, 45], F: [77, 113] },
  weight: [0.1, 700],
  height: { cm: [20, 280], in: [8, 110] },
  glucose: { "mg/dL": [20, 1000], "mmol/L": [1, 55] },
};

export function validateVital(input) {
  const { type, value, diastolicValue, unit, measuredAt } = input || {};
  const unitChoices = vitalUnits[type];
  const range = vitalRanges[type];
  const numericValue = typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
  const numericDiastolic = typeof diastolicValue === "number" && Number.isFinite(diastolicValue)
    ? diastolicValue
    : null;
  const bounds = Array.isArray(range) ? range : range?.[unit];
  const measured = typeof measuredAt === "string" ? new Date(measuredAt) : null;

  if (
    !unitChoices ||
    !unitChoices.includes(unit) ||
    !bounds ||
    !Number.isFinite(numericValue) ||
    numericValue < bounds[0] ||
    numericValue > bounds[1] ||
    (type === "blood_pressure"
      ? numericDiastolic === null || numericDiastolic < 20 || numericDiastolic > 200 || numericDiastolic >= numericValue
      : diastolicValue != null) ||
    !measured ||
    Number.isNaN(measured.getTime()) ||
    measured.getTime() > Date.now() + 5 * 60 * 1000
  ) {
    const error = new Error("Provide a valid vital type, value, measurement unit, and date.");
    error.statusCode = 400;
    throw error;
  }
  return {
    type,
    value: numericValue,
    diastolicValue: numericDiastolic,
    unit,
    measuredAt: measured.toISOString(),
  };
}

function validateRecordFields({ title, recordType }) {
  if (
    typeof title !== "string" || !title.trim() || title.length > 255 ||
    !["document", "lab_result", "imaging", "other"].includes(recordType)
  ) {
    const error = new Error("A title (255 characters or fewer) and valid record type are required.");
    error.statusCode = 400;
    throw error;
  }
}

export function hasExplicitRecordConsent(doctorUserId, grantedDoctorUserId) {
  return Number.isSafeInteger(Number(doctorUserId)) &&
    Number(doctorUserId) > 0 &&
    Number(doctorUserId) === Number(grantedDoctorUserId);
}

export function canAccessHealthRecord({ patientId, viewerId, viewerRole, grantedDoctorUserId }) {
  return viewerRole === "ADMIN" ||
    (viewerRole === "PATIENT" && Number(patientId) === Number(viewerId)) ||
    (viewerRole === "DOCTOR" && hasExplicitRecordConsent(viewerId, grantedDoctorUserId));
}

export async function listPatientHealthRecords(patientId) {
  const result = await query(
    `SELECT id, record_type, title, file_name, mime_type, file_size, recorded_at, created_at,
       COALESCE((
         SELECT json_agg(json_build_object('doctor_user_id', g.doctor_user_id, 'granted_at', g.granted_at))
         FROM health_record_access_grants g WHERE g.health_record_id = r.id
       ), '[]'::json) AS shared_with
     FROM health_records r WHERE patient_id = $1 ORDER BY recorded_at DESC, id DESC`,
    [patientId],
  );
  return result.rows;
}

export async function createHealthRecord({ patientId, title, recordType, file, recordedAt }) {
  validateRecordFields({ title, recordType });
  const type = validateHealthRecordFile(file);
  const date = recordedAt == null || recordedAt === "" ? new Date() : new Date(recordedAt);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 5 * 60 * 1000) {
    const error = new Error("Record date must be valid and cannot be in the future.");
    error.statusCode = 400;
    throw error;
  }
  const stored = await storePrivateHealthRecord(file, type);
  try {
    const result = await transaction(async (client) => {
      const inserted = await client.query(
      `INSERT INTO health_records
         (patient_id, record_type, title, file_key, file_name, mime_type, file_size, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, record_type, title, file_name, mime_type, file_size, recorded_at, created_at`,
      [
        patientId,
        recordType,
        title.trim(),
        stored.fileKey,
        safePrivateFileName(file.originalname),
        file.mimetype,
        file.size,
        date.toISOString(),
      ],
      );
      await client.query(
        `INSERT INTO audit_logs (user_id, action, target_type, target_id)
         VALUES ($1, 'health_record.upload', 'health_record', $2)`,
        [patientId, inserted.rows[0].id],
      );
      return inserted.rows[0];
    });
    return result;
  } catch (error) {
    try {
      await unlink(stored.path);
    } catch (cleanupError) {
      console.error("Could not remove an orphaned private health record:", cleanupError);
    }
    throw error;
  }
}

async function getRecordFile(recordId, viewerId, viewerRole) {
  const result = await query(
    `SELECT r.patient_id, r.file_key, r.file_name, r.mime_type,
       (SELECT g.doctor_user_id FROM health_record_access_grants g
        WHERE g.health_record_id = r.id AND g.doctor_user_id = $2) AS granted_doctor_user_id
     FROM health_records r WHERE r.id = $1`,
    [recordId, viewerId],
  );
  const record = result.rows[0];
  if (!record) return null;
  if (!canAccessHealthRecord({
    patientId: record.patient_id,
    viewerId,
    viewerRole,
    grantedDoctorUserId: record.granted_doctor_user_id,
  })) return null;
  const fileExtension = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" }[record.mime_type];
  return {
    path: getPrivateHealthRecordPath(record.file_key, record.mime_type),
    mimeType: record.mime_type,
    fileName: `hti-health-record${fileExtension}`,
  };
}

export function getPatientHealthRecordFile(patientId, recordId) {
  return getRecordFile(recordId, patientId, "PATIENT");
}

export function getAdminHealthRecordFile(recordId) {
  return getRecordFile(recordId, 0, "ADMIN");
}

export async function listAdminHealthRecords() {
  const result = await query(
    `SELECT r.id, r.record_type, r.title, r.file_name, r.file_size, r.recorded_at, r.created_at,
       u.full_name AS patient_name, u.email AS patient_email
     FROM health_records r JOIN users u ON u.id = r.patient_id ORDER BY r.created_at DESC`,
  );
  return result.rows;
}

export async function listPatientDoctors() {
  const result = await query(
    `SELECT u.id AS doctor_user_id, u.full_name
     FROM doctors d JOIN users u ON u.id = d.user_id
     WHERE d.application_status = 'approved' AND d.verification_status = 'verified'
       AND u.role = 'DOCTOR' AND u.account_status = 'active'
     ORDER BY u.full_name`,
  );
  return result.rows;
}

export async function setHealthRecordDoctorAccess({ patientId, recordId, doctorUserId, granted }) {
  return transaction(async (client) => {
    const record = await client.query(
      "SELECT id FROM health_records WHERE id = $1 AND patient_id = $2",
      [recordId, patientId],
    );
    if (!record.rows[0]) return null;
    if (granted) {
      const doctor = await client.query(
        `SELECT u.id FROM users u JOIN doctors d ON d.user_id = u.id
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
        `INSERT INTO health_record_access_grants (health_record_id, doctor_user_id, granted_by)
         VALUES ($1, $2, $3) ON CONFLICT (health_record_id, doctor_user_id)
         DO UPDATE SET granted_by = EXCLUDED.granted_by, granted_at = NOW()`,
        [recordId, doctorUserId, patientId],
      );
    } else {
      await client.query(
        "DELETE FROM health_record_access_grants WHERE health_record_id = $1 AND doctor_user_id = $2",
        [recordId, doctorUserId],
      );
    }
    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, 'health_record', $3, $4::jsonb)`,
      [patientId, granted ? "health_record.access.grant" : "health_record.access.revoke", recordId, JSON.stringify({ doctorUserId })],
    );
    return { recordId, doctorUserId, granted };
  });
}

export async function listDoctorHealthRecords(doctorUserId) {
  const result = await query(
    `SELECT r.id, r.patient_id, r.record_type, r.title, r.file_name, r.mime_type, r.file_size, r.recorded_at,
       u.full_name AS patient_name
     FROM health_records r
     JOIN health_record_access_grants g ON g.health_record_id = r.id AND g.doctor_user_id = $1
     JOIN users u ON u.id = r.patient_id
     ORDER BY r.recorded_at DESC`,
    [doctorUserId],
  );
  return result.rows;
}

export function getDoctorHealthRecordFile(doctorUserId, recordId) {
  return getRecordFile(recordId, doctorUserId, "DOCTOR");
}

export async function listPatientVitals(patientId) {
  const result = await query(
    `SELECT id, vital_type, value, diastolic_value, unit, measured_at, created_at
     FROM vitals WHERE patient_id = $1 ORDER BY measured_at DESC, id DESC LIMIT 500`,
    [patientId],
  );
  return result.rows;
}

export async function addPatientVital(patientId, input) {
  const vital = validateVital(input);
  const result = await query(
    `INSERT INTO vitals (patient_id, vital_type, value, diastolic_value, unit, measured_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, vital_type, value, diastolic_value, unit, measured_at, created_at`,
    [patientId, vital.type, vital.value, vital.diastolicValue, vital.unit, vital.measuredAt],
  );
  return result.rows[0];
}

export async function listPatientVitalsDoctors(patientId) {
  const result = await query(
    `SELECT u.id AS doctor_user_id, u.full_name, EXISTS (
       SELECT 1 FROM vitals_access_grants g WHERE g.patient_id = $1 AND g.doctor_user_id = u.id
     ) AS granted
     FROM doctors d JOIN users u ON u.id = d.user_id
     WHERE d.application_status = 'approved' AND d.verification_status = 'verified'
       AND u.role = 'DOCTOR' AND u.account_status = 'active'
     ORDER BY u.full_name`,
    [patientId],
  );
  return result.rows;
}

export async function setVitalsDoctorAccess({ patientId, doctorUserId, granted }) {
  return transaction(async (client) => {
    if (granted) {
      const doctor = await client.query(
        `SELECT u.id FROM users u JOIN doctors d ON d.user_id = u.id
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
        `INSERT INTO vitals_access_grants (patient_id, doctor_user_id)
         VALUES ($1, $2) ON CONFLICT (patient_id, doctor_user_id) DO NOTHING`,
        [patientId, doctorUserId],
      );
    } else {
      await client.query(
        "DELETE FROM vitals_access_grants WHERE patient_id = $1 AND doctor_user_id = $2",
        [patientId, doctorUserId],
      );
    }
    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, 'vitals_access', $3, $4::jsonb)`,
      [patientId, granted ? "vitals.access.grant" : "vitals.access.revoke", patientId, JSON.stringify({ doctorUserId })],
    );
    return { patientId, doctorUserId, granted };
  });
}

export async function listDoctorGrantedVitals(doctorUserId) {
  const result = await query(
    `SELECT v.id, v.patient_id, v.vital_type, v.value, v.diastolic_value, v.unit, v.measured_at,
       u.full_name AS patient_name
     FROM vitals v
     JOIN vitals_access_grants g ON g.patient_id = v.patient_id AND g.doctor_user_id = $1
     JOIN users u ON u.id = v.patient_id
     ORDER BY v.measured_at DESC LIMIT 1000`,
    [doctorUserId],
  );
  return result.rows;
}

