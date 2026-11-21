import {
  archivePublication,
  createPublication,
  deletePublicationPermanently,
  listAdminPublications,
  listPublishedPublications,
  reviewDoctorPublication,
  updatePublication,
} from "../services/publication.service.js";

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function getPublications(_request, response) {
  const publications = await listPublishedPublications();
  return response.status(200).json({ publications });
}

export async function getAdminPublications(_request, response) {
  const publications = await listAdminPublications();
  return response.status(200).json({ publications });
}

export async function createAdminPublication(request, response) {
  const publication = await createPublication({
    title: request.body?.title,
    content: request.body?.content,
    category: request.body?.category,
    status: request.body?.status || "draft",
  });
  return response.status(201).json({ publication });
}

export async function updateAdminPublication(request, response) {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Publication ID must be a positive integer." });
  }
  const publication = await updatePublication(id, request.body || {}, request.user.id);
  if (!publication) {
    return response.status(404).json({ error: "Publication not found." });
  }
  return response.status(200).json({ publication });
}

export async function archiveAdminPublication(request, response) {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Publication ID must be a positive integer." });
  }
  const publication = await archivePublication(id, request.user.id);
  if (!publication) {
    return response.status(404).json({ error: "Publication not found." });
  }
  return response.status(200).json({ publication });
}

export async function deleteAdminPublicationPermanently(request, response) {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Publication ID must be a positive integer." });
  }
  const deleted = await deletePublicationPermanently(id, request.user.id);
  if (!deleted) {
    return response.status(404).json({ error: "Publication not found." });
  }
  return response.status(200).json({ deleted });
}

export async function reviewAdminPublication(request, response) {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Publication ID must be a positive integer." });
  }
  const publication = await reviewDoctorPublication({
    publicationId: id,
    adminId: request.user.id,
    decision: request.body?.decision,
    reason: request.body?.reason,
  });
  if (!publication) {
    return response.status(404).json({ error: "Pending doctor publication not found." });
  }
  return response.status(200).json({ publication });
}