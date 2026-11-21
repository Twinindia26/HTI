"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

function displayDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

export default function AdminHealthRecords() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRecords = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return null;
    const response = await apiFetch(getToken, "admin/health-records", {
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || result.message || `Could not load health records (HTTP ${response.status}).`);
    return result.records;
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    let active = true;
    fetchRecords()
      .then((items) => { if (active && items) setRecords(items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load health records."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchRecords]);

  async function download(id) {
    try {
      const response = await apiFetch(getToken, `admin/health-records/${id}/file`);
      if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}.`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `hti-health-record-${id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not download health record.");
    }
  }

  return (
    <div className="admin-box">
      <h3>Private patient health records</h3>
      {error && <p role="alert">{error}</p>}
      {loading ? <p>Loading health records...</p> : records.length === 0 ? <p>No patient health records have been uploaded.</p> : records.map((record) => (
        <article className="request-result" key={record.id}>
          <div className="request-result-head">
            <div><b>{record.title} · {record.patient_name}</b><small>{record.patient_email} · {record.record_type} · {displayDate(record.recorded_at)}</small></div>
          </div>
          <button type="button" className="small-btn" onClick={() => download(record.id)}>Download private record</button>
        </article>
      ))}
    </div>
  );
}
