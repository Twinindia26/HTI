"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function DoctorWorkspace() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [publications, setPublications] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [records, setRecords] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPublications = useCallback(async () => {
    const response = await apiFetch(getToken, "doctor/publications", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Could not load publications (HTTP ${response.status}).`);
    const result = await response.json();
    return result.publications || [];
  }, [getToken]);

  const fetchSharedData = useCallback(async () => {
    const paths = ["doctor/prescriptions", "doctor/records", "doctor/vitals"];
    const responses = await Promise.all(
      paths.map((path) =>
        apiFetch(getToken, path, {
          cache: "no-store",
        }),
      ),
    );
    const results = await Promise.all(
      responses.map(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error || body.message || `Could not load shared data (HTTP ${response.status}).`);
        }
        return body;
      }),
    );
    return results;
  }, [getToken]);

  useEffect(() => {
    let active = true;
    if (isLoaded && isSignedIn) {
      Promise.all([fetchPublications(), fetchSharedData()])
        .then(([items, shared]) => {
          if (active) {
            setPublications(items);
            setPrescriptions(shared[0].prescriptions || []);
            setRecords(shared[1].records || []);
            setVitals(shared[2].vitals || []);
          }
        })
        .catch((cause) => {
          if (active) setError(cause instanceof Error ? cause.message : "Could not load doctor workspace.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, fetchPublications, fetchSharedData]);

  async function submitArticle(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await apiFetch(getToken, "doctor/publications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Submission failed with HTTP ${response.status}.`);
      form.reset();
      const items = await fetchPublications();
      setPublications(items);
      setSuccess("Form successfully submitted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Publication submission failed.");
    }
  }

  return (
    <>
      {error && <p role="alert">{error}</p>}
      {success && <p role="status" className="form-success-msg">{success}</p>}

      <div className="admin-box">
        <h3>Quick Patient &amp; Medicine Shop Services</h3>
        <p>As a verified doctor, you can also use all patient features alongside publishing blogs.</p>
        <div className="admin-actions">
          <Link href="/request" className="small-btn">Upload Prescription / Price Enquiry</Link>
          <Link href="/#partnerFinder" className="small-btn">Find Nearby Medicine Shops</Link>
          <Link href="/dashboard" className="small-btn">Open Patient Dashboard</Link>
          <Link href="/dashboard/requests" className="small-btn">My Prescription Requests</Link>
        </div>
      </div>

      <div className="admin-box">
        <h3>Upload a blog / publication for review</h3>
        <form className="admin-form" onSubmit={submitArticle}>
          <label>
            Title
            <input name="title" required maxLength="255" placeholder="Enter blog title" />
          </label>
          <label>
            Category
            <input name="category" maxLength="100" placeholder="e.g. Cardiology, Wellness" />
          </label>
          <label className="wide">
            Content
            <textarea name="content" required rows="5" maxLength="50000" placeholder="Write your article..." />
          </label>
          <div className="wide admin-actions">
            <button type="submit" className="btn btn-primary">Submit for admin approval</button>
          </div>
        </form>
      </div>

      <div className="admin-box">
        <h3>Your submitted blogs &amp; status</h3>
        {loading ? (
          <p>Loading...</p>
        ) : publications.length ? (
          publications.map((item) => {
            const isApproved = item.status === "published" || item.status === "approved";
            const isRejected = item.status === "rejected";
            const statusLabel = isApproved
              ? "Approved & Published"
              : isRejected
                ? "Rejected"
                : "Pending Review";

            return (
              <article key={item.id} className="request-result">
                <div className="request-result-head">
                  <div>
                    <b>{item.title}</b>
                    {item.category && <small>{item.category}</small>}
                  </div>
                  <span className={`status ${isApproved ? "verified" : ""}`}>
                    {statusLabel}
                  </span>
                </div>
                <p>{item.content}</p>
                {isRejected && (item.rejection_reason || item.review_reason) && (
                  <div className="reply-panel">
                    <b>Rejection reason from Admin:</b>
                    <p>{item.rejection_reason || item.review_reason}</p>
                  </div>
                )}
                {!isRejected && item.review_reason && (
                  <p><small>Administrator feedback: {item.review_reason}</small></p>
                )}
              </article>
            );
          })
        ) : (
          <p>No blogs submitted yet.</p>
        )}
      </div>

      <div className="admin-box">
        <h3>Prescriptions shared with you (Admin authorized)</h3>
        {loading ? (
          <p>Loading shared prescriptions...</p>
        ) : prescriptions.length === 0 ? (
          <p>No patient prescriptions have been shared with you yet.</p>
        ) : (
          prescriptions.map((item) => (
            <article key={item.id} className="request-result">
              <div className="request-result-head">
                <div>
                  <b>#{item.id} · {item.patient_name}</b>
                  <small>Medicine: {item.medicine_name} · Shared: {new Date(item.granted_at).toLocaleString()}</small>
                </div>
                <span className="status verified">{item.status}</span>
              </div>
              <p>{item.message}</p>
              {item.has_file && (
                <button
                  type="button"
                  className="small-btn"
                  onClick={async () => {
                    try {
                      const response = await apiFetch(getToken, `doctor/prescriptions/${item.id}/file`);
                      if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}.`);
                      const url = URL.createObjectURL(await response.blob());
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `hti-prescription-${item.id}`;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                    } catch (cause) {
                      setError(cause instanceof Error ? cause.message : "Could not download prescription.");
                    }
                  }}
                >
                  Download prescription file
                </button>
              )}
            </article>
          ))
        )}
      </div>

      <div className="admin-box">
        <h3>Patient records shared with you</h3>
        {loading ? (
          <p>Loading shared records...</p>
        ) : records.length === 0 ? (
          <p>No patients have shared health records with you.</p>
        ) : (
          records.map((record) => (
            <article key={record.id} className="request-result">
              <b>{record.title}</b>
              <small>{record.patient_name} · {record.record_type}</small>
              <button
                type="button"
                className="small-btn"
                onClick={async () => {
                  try {
                    const response = await apiFetch(getToken, `doctor/records/${record.id}/file`);
                    if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}.`);
                    const url = URL.createObjectURL(await response.blob());
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `hti-health-record-${record.id}`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                  } catch (cause) {
                    setError(cause instanceof Error ? cause.message : "Could not download record.");
                  }
                }}
              >
                Download shared record
              </button>
            </article>
          ))
        )}
      </div>

      <div className="admin-box">
        <h3>Patient vitals shared with you</h3>
        {loading ? (
          <p>Loading shared measurements...</p>
        ) : vitals.length === 0 ? (
          <p>No patients have shared vitals with you.</p>
        ) : (
          vitals.map((item) => (
            <article key={item.id} className="request-result">
              <b>
                {item.patient_name} · {item.vital_type.replaceAll("_", " ")}: {item.value}
                {item.diastolic_value != null ? ` / ${item.diastolic_value}` : ""} {item.unit}
              </b>
              <small>{new Date(item.measured_at).toLocaleString()}</small>
            </article>
          ))
        )}
      </div>
    </>
  );
}