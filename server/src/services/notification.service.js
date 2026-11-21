import { query } from "../config/db.js";

export async function listNotifications(userId) {
  const result = await query(
    `SELECT id, notification_type, message, read_at, created_at
     FROM notifications WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 100`,
    [userId],
  );
  return result.rows;
}

export async function markNotificationRead(userId, notificationId) {
  const result = await query(
    `UPDATE notifications SET read_at = COALESCE(read_at, NOW())
     WHERE id = $1 AND user_id = $2
     RETURNING id, read_at`,
    [notificationId, userId],
  );
  return result.rows[0] || null;
}
