import { env } from "../config/env.js";
import { query, transaction } from "../config/db.js";

export async function getUserByClerkId(clerkUserId) {
  const result = await query(
    `SELECT *
     FROM users
     WHERE clerk_user_id = $1`,
    [clerkUserId],
  );

  return result.rows[0] || null;
}

export async function upsertUserFromClerk({
  clerkUserId,
  fullName,
  email,
  profileImageUrl,
  emailVerified = false,
}) {
  return transaction(async (client) => {
    const result = await client.query(
      `INSERT INTO users (
         clerk_user_id,
         full_name,
         email,
         profile_image_url,
         role,
         account_status,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, 'PATIENT', 'active', NOW(), NOW())
       ON CONFLICT (clerk_user_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         profile_image_url = EXCLUDED.profile_image_url,
         updated_at = NOW()
       RETURNING *;`,
      [clerkUserId, fullName, email, profileImageUrl || null],
    );
    let user = result.rows[0];

    if (
      emailVerified &&
      env.adminEmail &&
      email.trim().toLowerCase() === env.adminEmail.trim().toLowerCase()
    ) {
      await client.query("SELECT pg_advisory_xact_lock($1)", [845091328]);
      const currentAdmin = await client.query(
        "SELECT id, clerk_user_id, email FROM users WHERE role = 'ADMIN' FOR UPDATE",
      );

      if (
        currentAdmin.rowCount &&
        currentAdmin.rows[0].id !== user.id &&
        currentAdmin.rows[0].email.trim().toLowerCase() !== env.adminEmail.trim().toLowerCase()
      ) {
        await client.query(
          "UPDATE users SET role = 'PATIENT', updated_at = NOW() WHERE id = $1",
          [currentAdmin.rows[0].id],
        );
      }

      const remainingAdmin = await client.query(
        "SELECT id, clerk_user_id FROM users WHERE role = 'ADMIN' FOR UPDATE",
      );

      if (!remainingAdmin.rowCount) {
        const promoted = await client.query(
          `UPDATE users SET role = 'ADMIN', updated_at = NOW()
           WHERE id = $1 AND lower(email) = lower($2)
           RETURNING *`,
          [user.id, env.adminEmail.trim()],
        );
        if (promoted.rowCount) {
          user = promoted.rows[0];
          await client.query(
            `INSERT INTO audit_logs (user_id, action, target_type, target_id)
             VALUES ($1, 'admin.bootstrap', 'user', $2)`,
            [user.id, user.id],
          );
        }
      } else if (remainingAdmin.rows[0].clerk_user_id === clerkUserId) {
        user = (await client.query("SELECT * FROM users WHERE id = $1", [user.id])).rows[0];
      }
    }

    return user;
  });
}

export async function hasApprovedDoctorProfile(userId) {
  const result = await query(
    `SELECT 1
     FROM doctors
     WHERE user_id = $1
       AND application_status = 'approved'
       AND verification_status = 'verified'
     LIMIT 1`,
    [userId],
  );

  return result.rowCount > 0;
}

export async function listUsers() {
  const result = await query(
    `SELECT *
     FROM users
     ORDER BY created_at DESC`,
  );

  return result.rows;
}

export async function updateUserStatus(clerkUserId, accountStatus) {
  const result = await query(
    `UPDATE users SET account_status = $2, updated_at = NOW()
     WHERE clerk_user_id = $1
     RETURNING id, clerk_user_id, full_name, email, role, account_status, updated_at`,
    [clerkUserId, accountStatus],
  );

  return result.rows[0] || null;
}

export async function transferAdminRole({ currentAdminId, targetUserId }) {
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock($1)", [845091328]);
    const admins = await client.query(
      "SELECT id FROM users WHERE role = 'ADMIN' FOR UPDATE",
    );
    if (admins.rowCount !== 1 || admins.rows[0].id !== currentAdminId) {
      const error = new Error("The current account is not the sole administrator.");
      error.statusCode = 403;
      throw error;
    }

    const target = await client.query(
      `SELECT id, account_status FROM users WHERE id = $1 FOR UPDATE`,
      [targetUserId],
    );
    if (!target.rowCount || target.rows[0].account_status !== "active" || targetUserId === currentAdminId) {
      const error = new Error("The replacement administrator must be a different active account.");
      error.statusCode = 400;
      throw error;
    }

    await client.query("UPDATE users SET role = 'PATIENT', updated_at = NOW() WHERE id = $1", [currentAdminId]);
    await client.query("UPDATE users SET role = 'ADMIN', updated_at = NOW() WHERE id = $1", [targetUserId]);
    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id)
       VALUES ($1, 'admin.transfer.out', 'user', $2),
              ($3, 'admin.transfer.in', 'user', $4)`,
      [currentAdminId, targetUserId, targetUserId, currentAdminId],
    );
    await client.query(
      `INSERT INTO notifications (user_id, notification_type, message)
       VALUES ($1, 'admin_transfer', 'Administrator access was transferred to this account.')`,
      [targetUserId],
    );
    return { transferred: true };
  });
}

export async function deactivateUserFromClerk(clerkUserId) {
  const result = await query(
    `UPDATE users
     SET account_status = 'inactive', updated_at = NOW()
     WHERE clerk_user_id = $1
     RETURNING id`,
    [clerkUserId],
  );
  return result.rows[0] || null;
}