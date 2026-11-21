import { Router } from "express";
import multer from "multer";
import { privateHealthRecordMimeTypes } from "../services/private-file.service.js";
import {
  downloadDoctorHealthRecord,
  downloadPatientHealthRecord,
  getDoctorHealthRecords,
  getDoctorVitals,
  getPatientDoctors,
  getPatientHealthRecords,
  getPatientVitals,
  getVitalsAccessDoctors,
  postPatientHealthRecord,
  postPatientVital,
  setPatientHealthRecordAccess,
  setPatientVitalsAccess,
} from "../controllers/health-data.controller.js";
import { requireAuth, requireDoctor, requirePatientOrDoctor } from "../middleware/auth.middleware.js";

const router = Router();
router.use((_request, response, next) => {
  response.set("Cache-Control", "private, no-store");
  next();
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(_request, file, callback) {
    if (!privateHealthRecordMimeTypes().includes(file.mimetype)) {
      const error = new Error("Upload a PDF, JPEG, PNG, or WebP file.");
      error.statusCode = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

function parseHealthRecordUpload(request, response, next) {
  upload.single("record")(request, response, (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") error.statusCode = 413;
      else if (error.name === "MulterError" && !error.statusCode) error.statusCode = 400;
      next(error);
      return;
    }
    next();
  });
}

router.get("/patient/records", requireAuth, requirePatientOrDoctor, getPatientHealthRecords);
router.post("/patient/records", requireAuth, requirePatientOrDoctor, parseHealthRecordUpload, postPatientHealthRecord);
router.get("/patient/records/doctors", requireAuth, requirePatientOrDoctor, getPatientDoctors);
router.get("/patient/records/:id/file", requireAuth, requirePatientOrDoctor, downloadPatientHealthRecord);
router.put("/patient/records/:id/access", requireAuth, requirePatientOrDoctor, setPatientHealthRecordAccess);
router.delete("/patient/records/:id/access", requireAuth, requirePatientOrDoctor, setPatientHealthRecordAccess);
router.get("/patient/vitals", requireAuth, requirePatientOrDoctor, getPatientVitals);
router.post("/patient/vitals", requireAuth, requirePatientOrDoctor, postPatientVital);
router.get("/patient/vitals/doctors", requireAuth, requirePatientOrDoctor, getVitalsAccessDoctors);
router.put("/patient/vitals/access", requireAuth, requirePatientOrDoctor, setPatientVitalsAccess);
router.delete("/patient/vitals/access", requireAuth, requirePatientOrDoctor, setPatientVitalsAccess);
router.get("/doctor/records", requireAuth, requireDoctor, getDoctorHealthRecords);
router.get("/doctor/records/:id/file", requireAuth, requireDoctor, downloadDoctorHealthRecord);
router.get("/doctor/vitals", requireAuth, requireDoctor, getDoctorVitals);

export default router;