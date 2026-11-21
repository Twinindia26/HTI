"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "../lib/api";

function displayDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString();
}

export default function PatientRequests() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      return;
    }
    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/patient/requests`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Could not load requests (HTTP ${response.status}).`);
    }
    const result = await response.json();
    return result.requests;
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    let active = true;
    fetchRequests()
      .then((items) => {
        if (active && items) {
          setRequests(items);
          setError("");
        }
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Could not load requests.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [fetchRequests]);

  async function downloadFile(requestId) {
    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/patient/requests/${requestId}/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`File download failed with HTTP ${response.status}.`);
      }
      const fileUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `hti-prescription-${requestId}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(fileUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "File download failed.");
    }
  }

  if (loading) {
    return <p>Loading your requests...</p>;
  }
  if (error) {
    return <p role="alert">{error}</p>;
  }
  if (!requests.length) {
    return <p>You have not submitted any requests yet.</p>;
  }

  return (
    <div className="customer-requests">
      {requests.map((request) => (
        <article key={request.id} className="request-result">
          <div className="request-result-head">
            <div>
              <b>{request.request_type === "price" ? "Medicine price enquiry" : "Prescription clarification"}</b>
              <small>Request #{request.id} · {displayDate(request.created_at)}</small>
            </div>
            <span className={`status ${request.status === "replied" ? "verified" : ""}`}>
              {request.status}
            </span>
          </div>
          <p><b>{request.medicine_name}</b></p>
          <p>{request.message}</p>
          {request.has_file && (
            <button type="button" className="small-btn" onClick={() => downloadFile(request.id)}>
              Download prescription file
            </button>
          )}
          {request.admin_reply && (
            <div className="reply-panel">
              <b>HTI reply</b>
              <p>{request.admin_reply}</p>
              {request.replied_at && <small>Replied: {displayDate(request.replied_at)}</small>}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
