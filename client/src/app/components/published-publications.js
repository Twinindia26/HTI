"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl } from "../lib/api";

export default function PublishedPublications() {
  const [publications, setPublications] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${getApiBaseUrl()}/publications`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Could not load publications (HTTP ${response.status}).`);
        }
        return response.json();
      })
      .then((result) => {
        if (active) setPublications(result.publications);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load publications.");
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <p role="alert">{error}</p>;
  }
  if (!publications.length) {
    return <p>No publications are available yet.</p>;
  }

  return (
    <div className="service-grid">
      {publications.map((publication) => (
        <article key={publication.id} className="service-card tint-sky">
          <div className="service-icon">+</div>
          <h3>{publication.title}</h3>
          {publication.category && <small>{publication.category}</small>}
          <p>{publication.content}</p>
        </article>
      ))}
    </div>
  );
}
