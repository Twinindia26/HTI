import { query, transaction } from "../config/db.js";

function validatePublication({ title, content, category, status }) {
  if (typeof title !== "string" || !title.trim() || title.length > 255) {
    const error = new Error("Publication title is required and must be 255 characters or fewer.");
    error.statusCode = 400;
    throw error;
  }
  if (typeof content !== "string" || !content.trim() || content.length > 50000) {
    const error = new Error("Publication content is required and must be 50000 characters or fewer.");
    error.statusCode = 400;
    throw error;
  }
  if (category != null && (typeof category !== "string" || category.length > 100)) {
    const error = new Error("Category must be 100 characters or fewer.");
    error.statusCode = 400;
    throw error;
  }
  if (status != null && !["draft", "published"].includes(status)) {
    const error = new Error("Publication status must be draft or published.");
    error.statusCode = 400;
    throw error;
  }
}

export function publicationIsPublic(publication) {
  return ["published", "approved"].includes(publication?.status) &&
    publication.archived_at == null &&
    (publication.doctor_id == null ||
      (publication.reviewed_by != null && publication.rejection_reason == null));
}

export async function listPublishedPublications() {
  const result = await query(
    `SELECT p.id, p.title, p.content, p.category, p.published_at, u.full_name AS author_name
     FROM publications p
     LEFT JOIN doctors d ON d.id = p.doctor_id
     LEFT JOIN users u ON u.id = d.user_id
     WHERE p.status IN ('published', 'approved') AND p.archived_at IS NULL
       AND (p.doctor_id IS NULL OR (p.reviewed_by IS NOT NULL AND p.rejection_reason IS NULL))
     ORDER BY COALESCE(p.published_at, p.created_at) DESC`,
  );
  return result.rows;
}

export async function listAdminPublications() {
  const result = await query(
    `SELECT p.id, p.doctor_id, p.title, p.content, p.category, p.status, p.created_at,
       p.published_at, p.archived_at, p.reviewed_by, p.reviewed_at, p.review_reason, p.rejection_reason,
       u.full_name AS doctor_name
     FROM publications p
     LEFT JOIN doctors d ON d.id = p.doctor_id
     LEFT JOIN users u ON u.id = d.user_id
     ORDER BY p.created_at DESC`,
  );
  return result.rows;
}

export async function createDoctorPublication({ authorDoctorId, title, content, category }) {
  validatePublication({ title, content, category });
  const result = await query(
    `INSERT INTO publications (doctor_id, title, content, category, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING id, title, content, category, status, created_at, published_at`,
    [authorDoctorId, title.trim(), content.trim(), category?.trim() || null],
  );
  return result.rows[0];
}

export async function listDoctorPublications(doctorId) {
  const result = await query(
    `SELECT id, title, content, category, status, created_at, published_at,
       reviewed_at, review_reason, rejection_reason
     FROM publications WHERE doctor_id = $1 AND archived_at IS NULL
     ORDER BY created_at DESC`,
    [doctorId],
  );
  return result.rows;
}

export async function createPublication({ authorDoctorId = null, title, content, category, status = "draft" }) {
  validatePublication({ title, content, category, status });
  const publishedAt = status === "published" ? new Date().toISOString() : null;
  const result = await query(
    `INSERT INTO publications (doctor_id, title, content, category, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, content, category, status, created_at, published_at`,
    [authorDoctorId, title.trim(), content.trim(), category?.trim() || null, status, publishedAt],
  );
  return result.rows[0];
}

export async function updatePublication(publicationId, changes, adminId) {
  validatePublication(changes);
  const isPublished = changes.status === "published";
  const result = await transaction(async (client) => {
    const existing = await client.query(
      "SELECT id, doctor_id, status, reviewed_by, rejection_reason FROM publications WHERE id = $1 AND archived_at IS NULL FOR UPDATE",
      [publicationId],
    );
    const current = existing.rows[0];
    if (!current) return null;
    if (isPublished && current.doctor_id != null &&
        (current.reviewed_by == null || current.rejection_reason != null)) {
      const error = new Error("Doctor publications must be approved by an administrator before publication.");
      error.statusCode = 409;
      throw error;
    }
    const updated = await client.query(
      `UPDATE publications
       SET title = $2, content = $3, category = $4, status = $5,
           published_at = CASE WHEN $6::BOOLEAN THEN COALESCE(published_at, NOW()) ELSE NULL END,
           updated_at = NOW()
       WHERE id = $1 AND archived_at IS NULL
       RETURNING id, title, status`,
      [
        publicationId,
        changes.title.trim(),
        changes.content.trim(),
        changes.category?.trim() || null,
        changes.status,
        isPublished,
      ],
    );
    const publication = updated.rows[0];
    if (publication) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, target_type, target_id)
         VALUES ($1, 'publication.update', 'publication', $2)`,
        [adminId, publication.id],
      );
    }
    return publication || null;
  });
  return result;
}

export async function reviewDoctorPublication({ publicationId, adminId, decision, reason }) {
  if (!["approved", "rejected"].includes(decision)) {
    const error = new Error("Decision must be approved or rejected.");
    error.statusCode = 400;
    throw error;
  }
  const reviewReason = typeof reason === "string" && reason.trim()
    ? reason.trim()
    : (decision === "approved" ? "Approved for publication." : "");
  if (!reviewReason || reviewReason.length > 2000) {
    const error = new Error("A rejection reason is required and must be 2000 characters or fewer.");
    error.statusCode = 400;
    throw error;
  }
  return transaction(async (client) => {
    const selected = await client.query(
      `SELECT p.id, p.doctor_id, p.status, d.user_id AS doctor_user_id
       FROM publications p JOIN doctors d ON d.id = p.doctor_id
       WHERE p.id = $1 AND p.archived_at IS NULL FOR UPDATE OF p`,
      [publicationId],
    );
    const publication = selected.rows[0];
    if (!publication || publication.status !== "pending") return null;
    if (Number(publication.doctor_user_id) === Number(adminId)) {
      const error = new Error("Administrators cannot review their own publication.");
      error.statusCode = 403;
      throw error;
    }

    const nextStatus = decision === "approved" ? "published" : "rejected";
    const isApproved = decision === "approved";
    const rejectionReason = decision === "rejected" ? reviewReason : null;

    const updated = await client.query(
      `UPDATE publications
       SET status = $2,
           reviewed_by = $3,
           reviewed_at = NOW(),
           published_at = CASE WHEN $5::BOOLEAN THEN COALESCE(published_at, NOW()) ELSE NULL END,
           review_reason = $4,
           rejection_reason = $6,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, doctor_id, status, reviewed_by, reviewed_at, published_at, review_reason, rejection_reason`,
      [publicationId, nextStatus, adminId, reviewReason, isApproved, rejectionReason],
    );
    const reviewed = updated.rows[0];
    await client.query(
      `INSERT INTO notifications (user_id, notification_type, message)
       VALUES ($1, 'publication_review', $2)`,
      [publication.doctor_user_id, `Your publication was ${decision}. Reason: ${reviewReason}`],
    );
    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id, metadata)
       VALUES ($1, 'publication.review', 'publication', $2, $3::jsonb)`,
      [adminId, reviewed.id, JSON.stringify({ decision, reason: reviewReason })],
    );
    return reviewed;
  });
}

export async function archivePublication(publicationId, adminId) {
  return transaction(async (client) => {
    const result = await client.query(
      `UPDATE publications
       SET archived_at = NOW(), status = 'draft', published_at = NULL, updated_at = NOW()
       WHERE id = $1 AND archived_at IS NULL RETURNING id`,
      [publicationId],
    );
    const publication = result.rows[0];
    if (publication) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, target_type, target_id)
         VALUES ($1, 'publication.archive', 'publication', $2)`,
        [adminId, publication.id],
      );
    }
    return publication || null;
  });
}

export async function deletePublicationPermanently(publicationId, adminId) {
  return transaction(async (client) => {
    const result = await client.query(
      `DELETE FROM publications WHERE id = $1 RETURNING id`,
      [publicationId],
    );
    const deleted = result.rows[0];
    if (!deleted) return null;
    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id)
       VALUES ($1, 'publication.delete', 'publication', $2)`,
      [adminId, deleted.id],
    );
    return deleted;
  });
}