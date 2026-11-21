import { getAuth } from "@clerk/express";
import { env, hasValidClerkKeys } from "../config/env.js";
import { getUserByClerkId, hasApprovedDoctorProfile } from "../services/user.service.js";

async function getActiveDatabaseUser(req, res) {
  if (!hasValidClerkKeys()) {
    res.status(503).json({ error: "Clerk authentication is not configured in this environment." });
    return null;
  }

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return null;
  }

  const user = await getUserByClerkId(userId);
  if (!user) {
    res.status(401).json({ error: "User is not registered in the HTI system." });
    return null;
  }

  if (user.account_status !== "active") {
    res.status(403).json({ error: "Your account is blocked or inactive." });
    return null;
  }

  return user;
}

export function requireClerkSession(req, res, next) {
  if (!hasValidClerkKeys()) {
    return res.status(503).json({ error: "Clerk authentication is not configured in this environment." });
  }

  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required." });
  }

  req.clerkUserId = userId;
  return next();
}

export async function requireAuth(req, res, next) {
  const user = req.user || await getActiveDatabaseUser(req, res);
  if (!user) {
    return;
  }

  req.user = user;
  return next();
}

export function requireAnyRole(...allowedRoles) {
  return async function (req, res, next) {
    const user = req.user || await getActiveDatabaseUser(req, res);
    if (!user) {
      return;
    }

    req.user = user;
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: `Access denied. ${allowedRoles.join(" or ")} role required.`,
      });
    }

    if (user.role === "ADMIN" &&
        (!env.adminEmail || user.email.toLowerCase() !== env.adminEmail.trim().toLowerCase())) {
      return res.status(403).json({ error: "Access denied. This account is not the configured administrator." });
    }

    if (user.role === "DOCTOR" && !(await hasApprovedDoctorProfile(user.id))) {
      return res.status(403).json({ error: "Doctor access requires an approved and verified profile." });
    }

    return next();
  };
}

export function requireRole(requiredRole) {
  return requireAnyRole(requiredRole);
}

export const requirePatient = requireRole("PATIENT");
export const requirePatientOrDoctor = requireAnyRole("PATIENT", "DOCTOR");
export const requireDoctor = requireRole("DOCTOR");
export const requireAdmin = requireRole("ADMIN");