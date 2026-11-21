import {
  createPrescriptionRequest,
  getPatientRequestFile,
  listPatientRequests,
} from "../services/prescription.service.js";
import { getPatientProfile, updatePatientProfile } from "../services/patient.service.js";

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function createPatientRequest(request, response) {
  const result = await createPrescriptionRequest({
    userId: request.user.id,
    requestType: request.body.requestType,
    medicineName: request.body.medicineName,
    message: request.body.message,
    file: request.file,
  });
  return response.status(201).json({ request: result });
}

export async function getPatientRequests(request, response) {
  const requests = await listPatientRequests(request.user.id);
  return response.status(200).json({ requests });
}

export async function getPatientProfileController(request, response) {
  const profile = await getPatientProfile(request.user.id);
  if (!profile) {
    return response.status(404).json({ error: "Patient profile not found." });
  }
  return response.status(200).json({ profile });
}

export async function updatePatientProfileController(request, response) {
  const { phone, dateOfBirth, address } = request.body || {};
  const parsedDate = typeof dateOfBirth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
    ? new Date(`${dateOfBirth}T00:00:00Z`)
    : null;
  if (
    (phone != null && (typeof phone !== "string" || phone.length > 40)) ||
    (address != null && (typeof address !== "string" || address.length > 1000)) ||
    (dateOfBirth != null && (
      typeof dateOfBirth !== "string" ||
      !parsedDate ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== dateOfBirth ||
      parsedDate.getTime() > Date.now()
    ))
  ) {
    return response.status(400).json({ error: "Provide valid profile fields; phone must be under 40 characters and address under 1000 characters." });
  }
  const profile = await updatePatientProfile({
    userId: request.user.id,
    phone: phone?.trim() || null,
    dateOfBirth: dateOfBirth || null,
    address: address?.trim() || null,
  });
  return response.status(200).json({ profile });
}

export async function downloadPatientRequestFile(request, response, next) {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Request ID must be a positive integer." });
  }
  const file = await getPatientRequestFile(request.user.id, id);
  if (!file) {
    return response.status(404).json({ error: "Prescription file not found." });
  }
  response.set("Cache-Control", "private, no-store").download(file.path, file.fileName, (error) => {
    if (error) {
      next(error);
    }
  });
}
