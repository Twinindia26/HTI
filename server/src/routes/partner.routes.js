import { Router } from "express";
import {
  getApprovedPartners,
  reverseGeocodeLocation,
  submitPartnerApplicationController,
} from "../controllers/partner.controller.js";
import { requireAuth, requirePatientOrDoctor } from "../middleware/auth.middleware.js";

const router = Router();
router.get("/", getApprovedPartners);
router.get("/reverse-geocode", reverseGeocodeLocation);
router.post("/applications", requireAuth, requirePatientOrDoctor, submitPartnerApplicationController);

export default router;