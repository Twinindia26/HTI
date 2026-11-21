"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "../lib/api";

export default function Notifications() {
  const { getToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async () => {
    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Could not load notifications (HTTP ${response.status}).`);
    const result = await response.json();
    return result.notifications;
  }, [getToken]);

  useEffect(() => {
    let active = true;
    fetchNotifications()
      .then((items) => { if (active) setNotifications(items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load notifications."); });
    return () => { active = false; };
  }, [fetchNotifications]);

  async function markRead(id) {
    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Could not mark notification read (HTTP ${response.status}).`);
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update notification.");
    }
  }

  return (
    <div className="admin-box">
      <h3>Notifications</h3>
      {error && <p role="alert">{error}</p>}
      {!notifications.length ? <p>No notifications.</p> : notifications.map((item) => (
        <article className="request-result" key={item.id}>
          <p>{item.message}</p>
          {!item.read_at && <button type="button" className="small-btn" onClick={() => markRead(item.id)}>Mark as read</button>}
        </article>
      ))}
    </div>
  );
}
