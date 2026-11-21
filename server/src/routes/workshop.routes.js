import { Router } from "express";
import { getUpcomingWorkshops } from "../controllers/workshop.controller.js";

const router = Router();
router.get("/", getUpcomingWorkshops);

export default router;
