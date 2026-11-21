import {
  deletePrescriptionRequest,
  getAdminRequestFile,
  getDoctorRequestFile,
  listAdminPrescriptionRequests,
  listDoctorGrantedPrescriptions,
  listVerifiedDoctorsForPrescriptionAccess,
  replyToPrescriptionRequest,
  setPrescriptionDoctorAccess,
  updatePrescriptionStatus,
} from "../services/prescription.service.js";

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function getPrescriptionRequests(_request, response) {
  const requests = await listAdminPrescriptionRequests();
  return response.status(200).json({ requests });
}

export async function downloadPrescriptionFile(request, response, next) {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Request ID must be a positive integer." });
  }
  const file = await getAdminRequestFile(id);
  if (!file) {
    return response.status(404).json({ error: "Prescription file not found." });
  }
  response.set("Cache-Control", "private, no-store").download(file.path, file.fileName, (error) => {
    if (error) {
      next(error);
    }
  });
}

export async function getPrescriptionDoctors(_request, response) {
  const doctors = await listVerifiedDoctorsForPrescriptionAccess();
  return response.status(200).json({ doctors });
}

export async function setAdminPrescriptionAccess(request, response) {
  const requestId = parseId(request.params.id);
  const doctorUserId = parseId(request.body?.doctorUserId);
  if (!requestId || !doctorUserId) {
    return response.status(400).json({ error: "A valid prescription request ID and doctor ID are required." });
  }
  const access = await setPrescriptionDoctorAccess({
    requestId,
    doctorUserId,
    adminId: request.user.id,
    granted: request.method === "PUT",
  });
  if (!access) {
    return response.status(404).json({ error: "Prescription request not found." });
  }
  return response.status(200).json({ access });
}

export async function getDoctorGrantedPrescriptionsController(request, response) {
  const prescriptions = await listDoctorGrantedPrescriptions(request.user.id);
  return response.status(200).json({ prescriptions });
}

export async function downloadDoctorPrescriptionFile(request, response, next) {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Request ID must be a positive integer." });
  }
  const file = await getDoctorRequestFile(request.user.id, id);
  if (!file) {
    return response.status(404).json({ error: "Prescription file not found or access not granted." });
  }
  response.set("Cache-Control", "private, no-store").download(file.path, file.fileName, (error) => {
    if (error) {
      next(error);
    }
  });
}

export async function replyToRequest(request, response) {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Request ID must be a positive integer." });
  }
  const result = await replyToPrescriptionRequest({
    requestId: id,
    adminId: request.user.id,
    reply: request.body?.reply,
  });
  if (!result) {
    return response.status(404).json({ error: "Prescription request not found." });
  }
  return response.status(200).json({ request: result });
}

export async function updateRequestStatus(request, response) {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Request ID must be a positive integer." });
  }
  const result = await updatePrescriptionStatus({
    requestId: id,
    adminId: request.user.id,
    status: request.body?.status,
  });
  if (!result) {
    return response.status(404).json({ error: "Prescription request not found." });
  }
  return response.status(200).json({ request: result });
}

export async function deletePrescriptionController(request, response) {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Request ID must be a positive integer." });
  }
  const deleted = await deletePrescriptionRequest({
    requestId: id,
    adminId: request.user.id,
  });
  if (!deleted) {
    return response.status(404).json({ error: "Prescription request not found." });
  }
  return response.status(200).json({ deleted: { id: deleted.id } });
}