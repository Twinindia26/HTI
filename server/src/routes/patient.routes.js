import { Router } from "express";
import multer from "multer";
import {
  createPatientRequest,
  downloadPatientRequestFile,
  getPatientProfileController,
  getPatientRequests,
  updatePatientProfileController,
} from "../controllers/patient.controller.js";
import { requireAuth, requirePatientOrDoctor } from "../middleware/auth.middleware.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(_request, file, callback) {
    const acceptedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
    if (!acceptedTypes.has(file.mimetype)) {
      const error = new Error("Upload a PDF, JPEG, PNG, or WebP file.");
      error.statusCode = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

function parsePrescriptionUpload(request, response, next) {
  upload.single("prescription")(request, response, (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        error.statusCode = 413;
      } else if (error.name === "MulterError" && !error.statusCode) {
        error.statusCode = 400;
      }
      next(error);
      return;
    }
    next();
  });
}

router.get("/profile", requireAuth, requirePatientOrDoctor, getPatientProfileController);
router.put("/profile", requireAuth, requirePatientOrDoctor, updatePatientProfileController);
router.get("/requests", requireAuth, requirePatientOrDoctor, getPatientRequests);
router.get("/requests/:id/file", requireAuth, requirePatientOrDoctor, downloadPatientRequestFile);
router.post("/requests", requireAuth, requirePatientOrDoctor, parsePrescriptionUpload, createPatientRequest);

export default router;