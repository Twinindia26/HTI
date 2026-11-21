"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SiteShell from "./site-shell";
import { getApiBaseUrl } from "../lib/api";

export default function AdminDoctors() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/admin/doctor-applications`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Could not load applications (HTTP ${response.status}).`);
    const result = await response.json();
    return result.applications;
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    let active = true;
    fetchApplications()
      .then((items) => {
        if (active && items) {
          setApplications(items);
          setError("");
        }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load applications.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchApplications]);

  async function review(applicationId, decision) {
    setError("");
    setSuccess("");
    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/admin/doctor-applications/${applicationId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Review failed with HTTP ${response.status}.`);
      }
      const items = await fetchApplications();
      if (items) setApplications(items);
      setSuccess(
        decision === "approved"
          ? "Doctor approved & verified! User role is now DOCTOR."
          : "Doctor access revoked/rejected. User role is now PATIENT.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not review application.");
    }
  }

  async function deleteDoctor(applicationId, fullName) {
    if (!window.confirm(`Permanently delete Dr. "${fullName}"? Their role will revert to PATIENT.`)) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/admin/doctor-applications/${applicationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Delete failed with HTTP ${response.status}.`);
      }
      const items = await fetchApplications();
      if (items) setApplications(items);
      setSuccess("Doctor profile permanently deleted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete doctor.");
    }
  }

  return (
    <SiteShell>
      <section className="admin-app">
        <header className="admin-top">
          <div className="brand">
            <img src="/images/hti-logo.png" alt="HTI" />
            <span>
              <b>HTI <em>Admin</em></b>
              <small>Provider verification</small>
            </span>
          </div>
          <Link href="/" className="btn btn-outline">Exit admin</Link>
        </header>
        <div className="admin-layout">
          <aside className="admin-side">
            <h3>Workspace</h3>
            <Link href="/admin" className="side-link">Dashboard</Link>
            <Link href="/admin/prescriptions" className="side-link">Prescription requests</Link>
            <Link href="/admin/prices" className="side-link">Price enquiries</Link>
            <Link href="/admin/doctors" className="side-link active">Doctor applications</Link>
            <Link href="/admin/partners" className="side-link">Partner requests</Link>
            <Link href="/admin/articles" className="side-link">Publications</Link>
            <Link href="/admin/workshops" className="side-link">Workshops</Link>
            <Link href="/admin/settings" className="side-link">Settings</Link>
          </aside>
          <div className="admin-content">
            <div className="admin-heading">
              <div>
                <span className="eyebrow">CONTROL CENTRE</span>
                <h1>Doctor applications</h1>
              </div>
              <button
                type="button"
                className="small-btn"
                onClick={() =>
                  fetchApplications()
                    .then((items) => items && setApplications(items))
                    .catch((cause) => setError(cause.message))
                }
              >
                Refresh
              </button>
            </div>
            {error && <p role="alert" className="form-error-msg">{error}</p>}
            {success && <p role="status" className="form-success-msg">{success}</p>}
            {loading ? (
              <p>Loading applications...</p>
            ) : applications.length ? (
              applications.map((application) => (
                <article key={application.id} className="admin-box">
                  <div className="request-result-head">
                    <div>
                      <h3>{application.full_name}</h3>
                      <small>{application.email}</small>
                    </div>
                    <span className={`status ${application.application_status === "approved" ? "verified" : ""}`}>
                      {application.application_status}
                    </span>
                  </div>
                  <p><b>Specialization:</b> {application.specialization}</p>
                  <p><b>License:</b> {application.license_number}</p>
                  <p><b>Experience:</b> {application.experience_years} years</p>
                  <p>{application.bio}</p>
                  <div className="admin-actions">
                    {application.application_status !== "approved" && (
                      <button
                        type="button"
                        className="small-btn"
                        onClick={() => review(application.id, "approved")}
                      >
                        Approve &amp; verify
                      </button>
                    )}
                    {application.application_status !== "rejected" && (
                      <button
                        type="button"
                        className="small-btn danger"
                        onClick={() => review(application.id, "rejected")}
                      >
                        {application.application_status === "approved" ? "Revoke Doctor" : "Reject"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="small-btn danger"
                      onClick={() => deleteDoctor(application.id, application.full_name)}
                    >
                      Delete Doctor
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p>No doctor applications have been submitted.</p>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}