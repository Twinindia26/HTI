import { Router } from "express";
import {
  applyAsDoctor,
  createDoctorArticle,
  getCurrentDoctorApplication,
  getDoctorArticles,
} from "../controllers/doctor.controller.js";
import {
  downloadDoctorPrescriptionFile,
  getDoctorGrantedPrescriptionsController,
} from "../controllers/prescription.controller.js";
import { requireAuth, requireDoctor, requirePatient } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/application", requireAuth, getCurrentDoctorApplication);
router.post("/application", requireAuth, requirePatient, applyAsDoctor);
router.get("/access", requireAuth, requireDoctor, (_request, response) => response.status(204).end());
router.get("/publications", requireAuth, requireDoctor, getDoctorArticles);
router.post("/publications", requireAuth, requireDoctor, createDoctorArticle);
router.get("/prescriptions", requireAuth, requireDoctor, getDoctorGrantedPrescriptionsController);
router.get("/prescriptions/:id/file", requireAuth, requireDoctor, downloadDoctorPrescriptionFile);

export default router;