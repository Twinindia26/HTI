import { query } from "../config/db.js";

export async function getAdminOverview(_request, response) {
  const result = await query(
    `SELECT
       (SELECT COUNT(*) FROM users) AS total_users,
       (SELECT COUNT(*) FROM prescription_requests) AS total_requests,
       (SELECT COUNT(*) FROM prescription_requests WHERE status = 'pending') AS pending_requests,
       (SELECT COUNT(*) FROM partner_applications WHERE status = 'pending') AS pending_partner_applications,
       (SELECT COUNT(*) FROM doctors WHERE application_status = 'pending') AS pending_doctor_applications,
       (SELECT COUNT(*) FROM publications
         WHERE status = 'published' AND archived_at IS NULL
           AND (doctor_id IS NULL OR (reviewed_by IS NOT NULL AND rejection_reason IS NULL))) AS published_content,
       (SELECT COUNT(*) FROM publications WHERE doctor_id IS NOT NULL AND status = 'pending' AND archived_at IS NULL) AS pending_publications,
       (SELECT COUNT(*) FROM workshops WHERE status = 'published' AND starts_at >= NOW()) AS upcoming_workshops`,
  );
  const overview = Object.fromEntries(
    Object.entries(result.rows[0]).map(([key, value]) => [key, Number(value)]),
  );
  return response.status(200).json({ overview });
}
