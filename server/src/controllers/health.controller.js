import { getHealthStatus } from "../services/health.service.js";
import { query } from "../config/db.js";

export function getHealth(_request, response) {
  response.status(200).json(getHealthStatus());
}

export async function getReadiness(_request, response) {
  try {
    await query("SELECT 1");
    return response.status(200).json({ status: "ready" });
  } catch {
    return response.status(503).json({ status: "unavailable" });
  }
}
