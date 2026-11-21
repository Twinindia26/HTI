import { listNotifications, markNotificationRead } from "../services/notification.service.js";

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function getNotifications(request, response) {
  const notifications = await listNotifications(request.user.id);
  return response.status(200).json({ notifications });
}

export async function readNotification(request, response) {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ error: "Notification ID must be a positive integer." });
  const notification = await markNotificationRead(request.user.id, id);
  if (!notification) return response.status(404).json({ error: "Notification not found." });
  return response.status(200).json({ notification });
}
