import { query, transaction } from "../config/db.js";

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function submitPartnerApplication(values) {
  const result = await query(
    `INSERT INTO partner_applications (
       user_id, partner_type, business_name, contact_name, phone, email,
       postal_code, address, latitude, longitude, license_details, services
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, partner_type, business_name, postal_code, status, submitted_at`,
    [
      values.userId,
      values.partnerType,
      values.businessName,
      values.contactName,
      values.phone,
      values.email || null,
      values.postalCode,
      values.address,
      values.latitude ?? null,
      values.longitude ?? null,
      values.licenseDetails || null,
      values.services || null,
    ],
  );
  return result.rows[0];
}

export async function listApprovedPartners({ postalCode = null, lat = null, lng = null, partnerType = null } = {}) {
  const result = await query(
    `SELECT id, partner_type, business_name, contact_name, phone, email, postal_code, address, services, latitude, longitude
     FROM partner_applications
     WHERE status = 'approved'
       AND ($1::VARCHAR IS NULL OR partner_type = $1)
     ORDER BY business_name
     LIMIT 300`,
    [partnerType],
  );

  const rows = result.rows.map((row) => {
    let distanceKm = null;
    if (lat != null && lng != null && row.latitude != null && row.longitude != null) {
      distanceKm = Number(haversineKm(lat, lng, row.latitude, row.longitude).toFixed(2));
    }
    return { ...row, distance_km: distanceKm };
  });

  const filtered = rows.filter((row) => {
    const pinMatch = postalCode && row.postal_code === postalCode;
    const nearbyMatch = row.distance_km != null && row.distance_km <= 30;
    if (postalCode && lat != null && lng != null) return pinMatch || nearbyMatch;
    if (postalCode) return pinMatch;
    if (lat != null && lng != null) return nearbyMatch;
    return true;
  });

  filtered.sort((a, b) => {
    const aPin = postalCode && a.postal_code === postalCode ? 0 : 1;
    const bPin = postalCode && b.postal_code === postalCode ? 0 : 1;
    if (aPin !== bPin) return aPin - bPin;
    if (a.distance_km != null && b.distance_km != null) return a.distance_km - b.distance_km;
    if (a.distance_km != null) return -1;
    if (b.distance_km != null) return 1;
    return a.business_name.localeCompare(b.business_name);
  });

  return filtered.slice(0, 100);
}

export async function listPartnerApplications() {
  const result = await query(
    `SELECT p.id, p.partner_type, p.business_name, p.contact_name, p.phone, p.email,
       p.postal_code, p.address, p.latitude, p.longitude, p.license_details, p.services, p.status,
       p.submitted_at, u.email AS applicant_email
     FROM partner_applications p
     JOIN users u ON u.id = p.user_id
     ORDER BY p.submitted_at DESC`,
  );
  return result.rows;
}

export async function reviewPartnerApplication({ applicationId, adminId, decision }) {
  if (!["approved", "rejected"].includes(decision)) {
    const error = new Error("Decision must be approved or rejected.");
    error.statusCode = 400;
    throw error;
  }
  return transaction(async (client) => {
    const result = await client.query(
      `UPDATE partner_applications
       SET status = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING id, user_id, status`,
      [applicationId, decision, adminId],
    );
    const application = result.rows[0];
    if (!application) return null;
    await client.query(
      `INSERT INTO notifications (user_id, notification_type, message)
       VALUES ($1, 'partner_application', $2)`,
      [application.user_id, `Your partner listing status was updated to ${decision}.`],
    );
    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id)
       VALUES ($1, 'partner.application.review', 'partner_application', $2)`,
      [adminId, application.id],
    );
    return application;
  });
}

export async function deletePartnerApplication({ applicationId, adminId }) {
  return transaction(async (client) => {
    const result = await client.query(
      `DELETE FROM partner_applications
       WHERE id = $1
       RETURNING id, user_id, business_name`,
      [applicationId],
    );
    const deleted = result.rows[0];
    if (!deleted) return null;

    await client.query(
      `INSERT INTO notifications (user_id, notification_type, message)
       VALUES ($1, 'partner_application', $2)`,
      [deleted.user_id, `Your partner listing (${deleted.business_name}) was removed by an administrator.`],
    );
    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id)
       VALUES ($1, 'partner.application.delete', 'partner_application', $2)`,
      [adminId, deleted.id],
    );
    return deleted;
  });
}