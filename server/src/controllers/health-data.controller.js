import {
  addPatientVital,
  createHealthRecord,
  getAdminHealthRecordFile,
  getDoctorHealthRecordFile,
  getPatientHealthRecordFile,
  listAdminHealthRecords,
  listDoctorGrantedVitals,
  listDoctorHealthRecords,
  listPatientDoctors,
  listPatientHealthRecords,
  listPatientVitals,
  listPatientVitalsDoctors,
  setHealthRecordDoctorAccess,
  setVitalsDoctorAccess,
} from "../services/health-data.service.js";

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function sendFile(file, response, next) {
  if (!file) return response.status(404).json({ error: "Private file not found." });
  response.set("Cache-Control", "private, no-store");
  response.type(file.mimeType);
  return response.download(file.path, file.fileName, { headers: { "Content-Disposition": `attachment; filename="${file.fileName}"` } }, (error) => {
    if (error) next(error);
  });
}

export async function getPatientHealthRecords(request, response) {
  const records = await listPatientHealthRecords(request.user.id);
  return response.status(200).json({ records });
}

export async function postPatientHealthRecord(request, response) {
  const record = await createHealthRecord({
    patientId: request.user.id,
    title: request.body?.title,
    recordType: request.body?.recordType,
    recordedAt: request.body?.recordedAt,
    file: request.file,
  });
  return response.status(201).json({ record });
}

export async function downloadPatientHealthRecord(request, response, next) {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ error: "Record ID must be a positive integer." });
  return sendFile(await getPatientHealthRecordFile(request.user.id, id), response, next);
}

export async function getPatientDoctors(_request, response) {
  const doctors = await listPatientDoctors();
  return response.status(200).json({ doctors });
}

export async function setPatientHealthRecordAccess(request, response) {
  const recordId = parseId(request.params.id);
  const doctorUserId = parseId(request.body?.doctorUserId);
  if (!recordId || !doctorUserId) {
    return response.status(400).json({ error: "A valid record ID and doctor ID are required." });
  }
  const access = await setHealthRecordDoctorAccess({
    patientId: request.user.id,
    recordId,
    doctorUserId,
    granted: request.method === "PUT",
  });
  if (!access) return response.status(404).json({ error: "Health record not found." });
  return response.status(200).json({ access });
}

export async function getPatientVitals(request, response) {
  const vitals = await listPatientVitals(request.user.id);
  return response.status(200).json({ vitals });
}

export async function postPatientVital(request, response) {
  const vital = await addPatientVital(request.user.id, request.body);
  return response.status(201).json({ vital });
}

export async function getVitalsAccessDoctors(request, response) {
  const doctors = await listPatientVitalsDoctors(request.user.id);
  return response.status(200).json({ doctors });
}

export async function setPatientVitalsAccess(request, response) {
  const doctorUserId = parseId(request.body?.doctorUserId);
  if (!doctorUserId) return response.status(400).json({ error: "A valid doctor ID is required." });
  const access = await setVitalsDoctorAccess({
    patientId: request.user.id,
    doctorUserId,
    granted: request.method === "PUT",
  });
  return response.status(200).json({ access });
}

export async function getDoctorHealthRecords(request, response) {
  const records = await listDoctorHealthRecords(request.user.id);
  return response.status(200).json({ records });
}

export async function downloadDoctorHealthRecord(request, response, next) {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ error: "Record ID must be a positive integer." });
  return sendFile(await getDoctorHealthRecordFile(request.user.id, id), response, next);
}

export async function getDoctorVitals(request, response) {
  const vitals = await listDoctorGrantedVitals(request.user.id);
  return response.status(200).json({ vitals });
}

export async function getAdminHealthRecords(_request, response) {
  const records = await listAdminHealthRecords();
  return response.status(200).json({ records });
}

export async function downloadAdminHealthRecord(request, response, next) {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ error: "Record ID must be a positive integer." });
  return sendFile(await getAdminHealthRecordFile(id), response, next);
}
