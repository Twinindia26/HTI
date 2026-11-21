import { query } from "../config/db.js";

export async function getPatientProfile(userId) {
  const result = await query(
    `SELECT u.id, u.full_name, u.email, u.health_card_id,
       p.phone, p.date_of_birth, p.address
     FROM users u
     LEFT JOIN patient_profiles p ON p.user_id = u.id
     WHERE u.id = $1 AND u.role IN ('PATIENT', 'DOCTOR') AND u.account_status = 'active'`,
    [userId],
  );
  return result.rows[0] || null;
}

export async function updatePatientProfile({ userId, phone, dateOfBirth, address }) {
  const result = await query(
    `INSERT INTO patient_profiles (user_id, phone, date_of_birth, address, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       phone = EXCLUDED.phone, date_of_birth = EXCLUDED.date_of_birth,
       address = EXCLUDED.address, updated_at = NOW()
     RETURNING user_id, phone, date_of_birth, address, updated_at`,
    [userId, phone || null, dateOfBirth || null, address || null],
  );
  return result.rows[0];
}