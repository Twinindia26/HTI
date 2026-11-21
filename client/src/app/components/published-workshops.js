"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl } from "../lib/api";

export default function PublishedWorkshops() {
  const [workshops, setWorkshops] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${getApiBaseUrl()}/workshops`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Could not load workshops (HTTP ${response.status}).`);
        return result.workshops;
      })
      .then((items) => { if (active) setWorkshops(items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load workshops."); });
    return () => { active = false; };
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!workshops.length) return <p>No upcoming workshops are scheduled yet.</p>;
  return (
    <div className="workshop-grid">
      {workshops.map((workshop) => (
        <article className="workshop-card" key={workshop.id}>
          <span className="date">{new Date(workshop.starts_at).toLocaleString()}</span>
          <h3>{workshop.title}</h3>
          <p>{workshop.description}</p>
          <small>{workshop.mode}</small>
        </article>
      ))}
    </div>
  );
}
