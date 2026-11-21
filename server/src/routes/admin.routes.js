import { Router } from "express";
import { listUserAccounts, transferAdministrator } from "../controllers/auth.controller.js";
import { getAdminOverview } from "../controllers/admin.controller.js";
import {
  deletePrescriptionController,
  downloadPrescriptionFile,
  getPrescriptionDoctors,
  getPrescriptionRequests,
  replyToRequest,
  setAdminPrescriptionAccess,
  updateRequestStatus,
} from "../controllers/prescription.controller.js";
import {
  deleteApplication,
  getDoctorApplications,
  reviewApplication,
} from "../controllers/doctor.controller.js";
import {
  archiveAdminPublication,
  createAdminPublication,
  deleteAdminPublicationPermanently,
  getAdminPublications,
  reviewAdminPublication,
  updateAdminPublication,
} from "../controllers/publication.controller.js";
import {
  deletePartnerApplicationController,
  getPartnerApplications,
  reviewPartnerApplicationController,
} from "../controllers/partner.controller.js";
import {
  archiveWorkshopController,
  createWorkshopController,
  getWorkshopsForAdmin,
  updateWorkshopController,
} from "../controllers/workshop.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware.js";
import multer from "multer";
import { env } from "../config/env.js";
import {
  downloadUploadedScript,
  getUploadedScripts,
  postUploadedScript,
} from "../controllers/script-upload.controller.js";
import {
  downloadAdminHealthRecord,
  getAdminHealthRecords,
} from "../controllers/health-data.controller.js";

const scriptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.uploadScriptMaxBytes, files: 1 },
  fileFilter(_request, file, callback) {
    if (!env.uploadScriptMimeTypes.has(file.mimetype.toLowerCase())) {
      const error = new Error("Upload a permitted text script file.");
      error.statusCode = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

function parseScriptUpload(request, response, next) {
  scriptUpload.single("script")(request, response, (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") error.statusCode = 413;
      else if (error.name === "MulterError" && !error.statusCode) error.statusCode = 400;
      next(error);
      return;
    }
    next();
  });
}

const router = Router();
router.use((_request, response, next) => {
  response.set("Cache-Control", "private, no-store");
  next();
});

router.post("/transfer", requireAuth, transferAdministrator);
router.get("/overview", requireAdmin, getAdminOverview);
router.get("/access", requireAdmin, (_request, response) => response.status(204).end());
router.get("/users", requireAdmin, listUserAccounts);
router.get("/prescriptions", requireAdmin, getPrescriptionRequests);
router.get("/prescriptions/doctors", requireAdmin, getPrescriptionDoctors);
router.get("/prescriptions/:id/file", requireAdmin, downloadPrescriptionFile);
router.put("/prescriptions/:id/access", requireAdmin, setAdminPrescriptionAccess);
router.delete("/prescriptions/:id/access", requireAdmin, setAdminPrescriptionAccess);
router.delete("/prescriptions/:id", requireAdmin, deletePrescriptionController);
router.get("/scripts", requireAdmin, getUploadedScripts);
router.post("/scripts", requireAdmin, parseScriptUpload, postUploadedScript);
router.get("/scripts/:id/file", requireAdmin, downloadUploadedScript);
router.get("/health-records", requireAdmin, getAdminHealthRecords);
router.get("/health-records/:id/file", requireAdmin, downloadAdminHealthRecord);
router.patch("/prescriptions/:id/reply", requireAdmin, replyToRequest);
router.patch("/prescriptions/:id/status", requireAdmin, updateRequestStatus);
router.get("/doctor-applications", requireAdmin, getDoctorApplications);
router.patch("/doctor-applications/:id", requireAdmin, reviewApplication);
router.delete("/doctor-applications/:id", requireAdmin, deleteApplication);
router.get("/publications", requireAdmin, getAdminPublications);
router.post("/publications", requireAdmin, createAdminPublication);
router.patch("/publications/:id", requireAdmin, updateAdminPublication);
router.patch("/publications/:id/review", requireAdmin, reviewAdminPublication);
router.delete("/publications/:id", requireAdmin, archiveAdminPublication);
router.delete("/publications/:id/permanent", requireAdmin, deleteAdminPublicationPermanently);
router.get("/partners", requireAdmin, getPartnerApplications);
router.patch("/partners/:id", requireAdmin, reviewPartnerApplicationController);
router.delete("/partners/:id", requireAdmin, deletePartnerApplicationController);
router.get("/workshops", requireAdmin, getWorkshopsForAdmin);
router.post("/workshops", requireAdmin, createWorkshopController);
router.patch("/workshops/:id", requireAdmin, updateWorkshopController);
router.delete("/workshops/:id", requireAdmin, archiveWorkshopController);

export default router;