import { query, transaction } from "../config/db.js";

function validateWorkshop(values) {
  const startsAt = new Date(values.startsAt);
  if (
    typeof values.startsAt !== "string" ||
    typeof values.title !== "string" || !values.title.trim() || values.title.length > 255 ||
    typeof values.description !== "string" || !values.description.trim() || values.description.length > 10000 ||
    Number.isNaN(startsAt.getTime()) ||
    typeof values.mode !== "string" || !values.mode.trim() || values.mode.length > 40 ||
    !["draft", "published"].includes(values.status)
  ) {
    const error = new Error("Provide a title, description, valid schedule, mode, and draft or published status.");
    error.statusCode = 400;
    throw error;
  }
  return startsAt.toISOString();
}

export async function listUpcomingWorkshops() {
  const result = await query(
    `SELECT id, title, description, starts_at, mode
     FROM workshops
     WHERE status = 'published' AND starts_at >= NOW()
     ORDER BY starts_at
     LIMIT 100`,
  );
  return result.rows;
}

export async function listAdminWorkshops() {
  const result = await query(
    `SELECT id, title, description, starts_at, mode, status, created_at
     FROM workshops
     WHERE status <> 'archived'
     ORDER BY starts_at`,
  );
  return result.rows;
}

export async function createWorkshop(values, adminId) {
  const startsAt = validateWorkshop(values);
  const result = await query(
    `INSERT INTO workshops (title, description, starts_at, mode, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, description, starts_at, mode, status`,
    [values.title.trim(), values.description.trim(), startsAt, values.mode.trim(), values.status, adminId],
  );
  return result.rows[0];
}

export async function updateWorkshop(workshopId, values, adminId) {
  const startsAt = validateWorkshop(values);
  return transaction(async (client) => {
    const result = await client.query(
      `UPDATE workshops
       SET title = $2, description = $3, starts_at = $4, mode = $5, status = $6, updated_at = NOW()
       WHERE id = $1 AND status <> 'archived'
       RETURNING id, title, status`,
      [workshopId, values.title.trim(), values.description.trim(), startsAt, values.mode.trim(), values.status],
    );
    const workshop = result.rows[0];
    if (workshop) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, target_type, target_id)
         VALUES ($1, 'workshop.update', 'workshop', $2)`,
        [adminId, workshop.id],
      );
    }
    return workshop || null;
  });
}

export async function archiveWorkshop(workshopId, adminId) {
  return transaction(async (client) => {
    const result = await client.query(
      `UPDATE workshops SET status = 'archived', updated_at = NOW()
       WHERE id = $1 AND status <> 'archived' RETURNING id`,
      [workshopId],
    );
    const workshop = result.rows[0];
    if (workshop) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, target_type, target_id)
         VALUES ($1, 'workshop.archive', 'workshop', $2)`,
        [adminId, workshop.id],
      );
    }
    return workshop || null;
  });
}
