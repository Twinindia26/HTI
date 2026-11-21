import {
  archiveWorkshop,
  createWorkshop,
  listAdminWorkshops,
  listUpcomingWorkshops,
  updateWorkshop,
} from "../services/workshop.service.js";

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function getUpcomingWorkshops(_request, response) {
  const workshops = await listUpcomingWorkshops();
  return response.status(200).json({ workshops });
}

export async function getWorkshopsForAdmin(_request, response) {
  const workshops = await listAdminWorkshops();
  return response.status(200).json({ workshops });
}

export async function createWorkshopController(request, response) {
  const workshop = await createWorkshop(request.body || {}, request.user.id);
  return response.status(201).json({ workshop });
}

export async function updateWorkshopController(request, response) {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ error: "Workshop ID must be a positive integer." });
  const workshop = await updateWorkshop(id, request.body || {}, request.user.id);
  if (!workshop) return response.status(404).json({ error: "Workshop not found." });
  return response.status(200).json({ workshop });
}

export async function archiveWorkshopController(request, response) {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ error: "Workshop ID must be a positive integer." });
  const workshop = await archiveWorkshop(id, request.user.id);
  if (!workshop) return response.status(404).json({ error: "Workshop not found." });
  return response.status(200).json({ workshop });
}
