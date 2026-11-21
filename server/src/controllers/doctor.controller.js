import {
  deleteDoctorApplication,
  getDoctorId,
  getDoctorApplication,
  listDoctorApplications,
  reviewDoctorApplication,
  submitDoctorApplication,
} from "../services/doctor.service.js";
import { createDoctorPublication, listDoctorPublications } from "../services/publication.service.js";

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function applyAsDoctor(request, response) {
  const { specialization, licenseNumber, experienceYears, bio } = request.body || {};
  const years = typeof experienceYears === "string" && experienceYears.trim()
    ? Number(experienceYears)
    : typeof experienceYears === "number"
      ? experienceYears
      : Number.NaN;
  if (
    typeof specialization !== "string" || !specialization.trim() || specialization.length > 255 ||
    typeof licenseNumber !== "string" || !licenseNumber.trim() || licenseNumber.length > 100 ||
    !Number.isInteger(years) || years < 0 || years > 60 ||
    typeof bio !== "string" || bio.length > 5000
  ) {
    return response.status(400).json({ error: "Provide a valid specialization, license number, experience (0-60 years), and biography." });
  }
  const application = await submitDoctorApplication({
    userId: request.user.id,
    specialization: specialization.trim(),
    licenseNumber: licenseNumber.trim(),
    experienceYears: years,
    bio: bio.trim(),
  });
  return response.status(201).json({ application });
}

export async function getDoctorApplications(_request, response) {
  const applications = await listDoctorApplications();
  return response.status(200).json({ applications });
}

export async function getCurrentDoctorApplication(request, response) {
  const application = await getDoctorApplication(request.user.id);
  return response.status(200).json({ application });
}

export async function reviewApplication(request, response) {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Application ID must be a positive integer." });
  }
  const application = await reviewDoctorApplication({
    applicationId: id,
    adminId: request.user.id,
    decision: request.body?.decision,
  });
  if (!application) {
    return response.status(404).json({ error: "Doctor application not found." });
  }
  return response.status(200).json({ application });
}

export async function deleteApplication(request, response) {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Application ID must be a positive integer." });
  }
  const deleted = await deleteDoctorApplication({
    applicationId: id,
    adminId: request.user.id,
  });
  if (!deleted) {
    return response.status(404).json({ error: "Doctor application not found." });
  }
  return response.status(200).json({ deleted });
}

export async function getDoctorArticles(request, response) {
  const doctorId = await getDoctorId(request.user.id);
  if (!doctorId) {
    return response.status(403).json({ error: "An approved doctor profile is required." });
  }
  const publications = await listDoctorPublications(doctorId);
  return response.status(200).json({ publications });
}

export async function createDoctorArticle(request, response) {
  const doctorId = await getDoctorId(request.user.id);
  if (!doctorId) {
    return response.status(403).json({ error: "An approved doctor profile is required." });
  }
  const publication = await createDoctorPublication({
    authorDoctorId: doctorId,
    title: request.body?.title,
    content: request.body?.content,
    category: request.body?.category,
  });
  return response.status(201).json({ publication });
}