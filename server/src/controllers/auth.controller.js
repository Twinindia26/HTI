import { clerkClient } from "@clerk/express";
import { env } from "../config/env.js";
import { query } from "../config/db.js";
import {
  listUsers,
  transferAdminRole,
  updateUserStatus,
  upsertUserFromClerk,
} from "../services/user.service.js";

export async function getCurrentUser(request, response) {
  const user = request.user;
  return response.status(200).json({ user });
}

export async function syncCurrentUser(request, response) {
  const { clerkUserId } = request;

  if (!clerkUserId) {
    return response.status(400).json({ error: "Missing Clerk user identity." });
  }

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const primaryEmail = clerkUser.emailAddresses.find(
    (address) => address.id === clerkUser.primaryEmailAddressId,
  );
  const email = primaryEmail?.emailAddress;

  if (!email) {
    return response.status(400).json({ error: "An email address is required." });
  }

  const isVerified = primaryEmail.verification?.status === "verified";
  const isAdminCandidate = Boolean(
    env.adminEmail && email.trim().toLowerCase() === env.adminEmail.trim().toLowerCase(),
  );

  if (isAdminCandidate && !isVerified) {
    return response.status(403).json({
      error: "Verify your primary email address before using this administrator account.",
    });
  }

  const user = await upsertUserFromClerk({
    clerkUserId,
    fullName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "HTI User",
    email,
    profileImageUrl: clerkUser.imageUrl,
    emailVerified: isVerified,
  });

  return response.status(200).json({ user });
}

export async function listUserAccounts(_request, response) {
  const users = await listUsers();
  return response.status(200).json({ users });
}

export async function updateUserAccountStatus(request, response) {
  const { clerkUserId, accountStatus } = request.body || {};

  if (!clerkUserId || !accountStatus) {
    return response.status(400).json({ error: "clerkUserId and accountStatus are required." });
  }
  if (!["active", "blocked", "inactive"].includes(accountStatus)) {
    return response.status(400).json({ error: "Account status must be active, blocked, or inactive." });
  }
  if (request.user.clerk_user_id === clerkUserId && accountStatus !== "active") {
    return response.status(400).json({ error: "An administrator cannot disable their own account." });
  }

  const user = await updateUserStatus(clerkUserId, accountStatus);

  if (!user) {
    return response.status(404).json({ error: "User not found." });
  }

  return response.status(200).json({ user });
}

export async function transferAdministrator(request, response) {
  if (request.user.role !== "ADMIN") {
    return response.status(403).json({ error: "Only the current database administrator may transfer access." });
  }
  const newAdminEmail = typeof request.body?.newAdminEmail === "string"
    ? request.body.newAdminEmail.trim().toLowerCase()
    : "";
  if (!env.adminEmail || newAdminEmail !== env.adminEmail.trim().toLowerCase()) {
    return response.status(400).json({ error: "The replacement email must match the configured ADMIN_EMAIL." });
  }

  const result = await query(
    `SELECT id, clerk_user_id FROM users
     WHERE lower(email) = $1 AND account_status = 'active'`,
    [newAdminEmail],
  );
  if (result.rowCount !== 1 || result.rows[0].clerk_user_id === request.user.clerk_user_id) {
    return response.status(400).json({ error: "The replacement must be a different, active HTI account." });
  }

  const clerkUser = await clerkClient.users.getUser(result.rows[0].clerk_user_id);
  const verifiedEmail = clerkUser.emailAddresses.find(
    (address) => address.id === clerkUser.primaryEmailAddressId,
  );
  if (
    verifiedEmail?.verification?.status !== "verified" ||
    verifiedEmail.emailAddress.trim().toLowerCase() !== newAdminEmail
  ) {
    return response.status(400).json({ error: "The replacement account must have the configured verified primary email." });
  }

  await transferAdminRole({
    currentAdminId: request.user.id,
    targetUserId: result.rows[0].id,
  });
  return response.status(204).end();
}