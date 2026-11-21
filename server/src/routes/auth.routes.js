import { Router } from "express";
import { getCurrentUser, listUserAccounts, syncCurrentUser, updateUserAccountStatus } from "../controllers/auth.controller.js";
import { requireAdmin, requireAuth, requireClerkSession } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/me", requireAuth, getCurrentUser);
router.post("/sync-user", requireClerkSession, syncCurrentUser);
router.get("/users", requireAuth, requireAdmin, listUserAccounts);
router.patch("/users/status", requireAuth, requireAdmin, updateUserAccountStatus);

export default router;
