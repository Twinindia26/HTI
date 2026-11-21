export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
  const baseUrl = configuredUrl.replace(/\/+$/, "");
  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
}

export async function apiFetch(getToken, path, options = {}) {
  const token = await getToken();
  if (!token) {
    throw new Error("Clerk did not provide a session token.");
  }
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  const apiPath = String(path).replace(/^\/+/, "");
  return fetch(`${getApiBaseUrl()}/${apiPath}`, { ...options, headers });
}

const pendingUserSyncs = new Map();

export function syncDatabaseUser(clerkUserId, getToken) {
  const pendingRequest = pendingUserSyncs.get(clerkUserId);
  if (pendingRequest) {
    return pendingRequest;
  }

  const request = (async () => {
    const response = await apiFetch(getToken, "auth/sync-user", {
      method: "POST",
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const detail = errorBody.error || errorBody.message || `HTTP ${response.status}`;
      throw new Error(`Account sync failed: ${detail}`);
    }

    const result = await response.json();
    return result.user;
  })().finally(() => {
    pendingUserSyncs.delete(clerkUserId);
  });

  pendingUserSyncs.set(clerkUserId, request);
  return request;
}