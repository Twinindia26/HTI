import { Router } from "express";
import { getNotifications, readNotification } from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();
router.get("/", requireAuth, getNotifications);
router.patch("/:id/read", requireAuth, readNotification);

export default router;
