import { query, transaction } from "../config/db.js";

export async function submitDoctorApplication({ userId, specialization, licenseNumber, experienceYears, bio }) {
  return transaction(async (client) => {
    const user = await client.query("SELECT role FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (user.rows[0]?.role !== "PATIENT") {
      const error = new Error("Only patient accounts may submit a doctor application.");
      error.statusCode = 403;
      throw error;
    }

    const result = await client.query(
      `INSERT INTO doctors (
         user_id, application_status, specialization, license_number,
         experience_years, bio, verification_status, submitted_at, updated_at
       ) VALUES ($1, 'pending', $2, $3, $4, $5, 'pending', NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         application_status = 'pending', specialization = EXCLUDED.specialization,
         license_number = EXCLUDED.license_number, experience_years = EXCLUDED.experience_years,
         bio = EXCLUDED.bio, verification_status = 'pending', approved_by = NULL,
         submitted_at = NOW(), updated_at = NOW()
       RETURNING id, application_status, specialization, submitted_at`,
      [userId, specialization, licenseNumber, experienceYears, bio],
    );
    return result.rows[0];
  });
}

export async function listDoctorApplications() {
  const result = await query(
    `SELECT d.id, d.user_id, d.application_status, d.verification_status, d.specialization, d.license_number,
       d.experience_years, d.bio, d.submitted_at, u.full_name, u.email
     FROM doctors d JOIN users u ON u.id = d.user_id
     ORDER BY d.submitted_at DESC NULLS LAST, d.created_at DESC`,
  );
  return result.rows;
}

export async function getDoctorApplication(userId) {
  const result = await query(
    `SELECT id, application_status, specialization, license_number,
       experience_years, bio, submitted_at
     FROM doctors WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0] || null;
}

export async function reviewDoctorApplication({ applicationId, adminId, decision }) {
  if (!["approved", "rejected"].includes(decision)) {
    const error = new Error("Decision must be approved or rejected.");
    error.statusCode = 400;
    throw error;
  }

  const verificationStatus = decision === "approved" ? "verified" : "rejected";
  const approvedBy = decision === "approved" ? adminId : null;
  const nextRole = decision === "approved" ? "DOCTOR" : "PATIENT";

  return transaction(async (client) => {
    const result = await client.query(
      `UPDATE doctors
       SET application_status = $2,
           verification_status = $3,
           approved_by = $4,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, user_id, application_status`,
      [applicationId, decision, verificationStatus, approvedBy],
    );
    const application = result.rows[0];
    if (!application) {
      return null;
    }

    await client.query(
      `UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1 AND role <> 'ADMIN'`,
      [application.user_id, nextRole],
    );
    await client.query(
      `INSERT INTO notifications (user_id, notification_type, message)
       VALUES ($1, 'doctor_application', $2)`,
      [application.user_id, `Your doctor application status was updated to ${decision}.`],
    );
    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id)
       VALUES ($1, 'doctor.application.review', 'doctor', $2)`,
      [adminId, application.id],
    );
    return application;
  });
}

export async function deleteDoctorApplication({ applicationId, adminId }) {
  return transaction(async (client) => {
    const deleted = await client.query(
      `DELETE FROM doctors WHERE id = $1 RETURNING id, user_id`,
      [applicationId],
    );
    const record = deleted.rows[0];
    if (!record) return null;

    await client.query(
      `UPDATE users SET role = 'PATIENT', updated_at = NOW() WHERE id = $1 AND role = 'DOCTOR'`,
      [record.user_id],
    );
    await client.query(
      `INSERT INTO notifications (user_id, notification_type, message)
       VALUES ($1, 'doctor_application', 'Your doctor profile was removed by an administrator.')`,
      [record.user_id],
    );
    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id)
       VALUES ($1, 'doctor.application.delete', 'doctor', $2)`,
      [adminId, record.id],
    );
    return record;
  });
}

export async function getDoctorId(userId) {
  const result = await query(
    `SELECT id FROM doctors
     WHERE user_id = $1 AND application_status = 'approved'
       AND verification_status = 'verified'`,
    [userId],
  );
  return result.rows[0]?.id || null;
}