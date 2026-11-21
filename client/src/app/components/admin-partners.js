"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SiteShell from "./site-shell";
import { getApiBaseUrl } from "../lib/api";

export default function AdminPartners() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/admin/partners`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Could not load partner applications (HTTP ${response.status}).`);
    const result = await response.json();
    return result.applications;
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    let active = true;
    fetchApplications()
      .then((items) => {
        if (active && items) setApplications(items);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load partner applications.");
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
      const response = await fetch(`${getApiBaseUrl()}/admin/partners/${applicationId}`, {
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
          ? "Shop approved and visible on website."
          : "Shop hidden/rejected from website.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not review application.");
    }
  }

  async function deletePartner(applicationId, businessName) {
    if (!window.confirm(`Permanently delete "${businessName}"? It will be removed from the database and website.`)) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/admin/partners/${applicationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Delete failed with HTTP ${response.status}.`);
      }
      const items = await fetchApplications();
      if (items) setApplications(items);
      setSuccess("Partner shop permanently deleted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete partner.");
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
              <small>Partner &amp; medicine shop verification</small>
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
            <Link href="/admin/doctors" className="side-link">Doctor applications</Link>
            <Link href="/admin/partners" className="side-link active">Partner requests</Link>
            <Link href="/admin/articles" className="side-link">Publications</Link>
            <Link href="/admin/workshops" className="side-link">Workshops</Link>
            <Link href="/admin/settings" className="side-link">Settings</Link>
          </aside>
          <div className="admin-content">
            <div className="admin-heading">
              <div>
                <span className="eyebrow">CONTROL CENTRE</span>
                <h1>Medicine shops &amp; diagnostic partner applications</h1>
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
              applications.map((application) => {
                const contactEmail = application.email || application.applicant_email;
                const digitsPhone = String(application.phone || "").replace(/\D/g, "");
                const hasCoords = application.latitude != null && application.longitude != null;

                return (
                  <article key={application.id} className="admin-box">
                    <div className="request-result-head">
                      <div>
                        <h3>{application.business_name}</h3>
                        <small>{application.partner_type.toUpperCase()} · PIN {application.postal_code}</small>
                      </div>
                      <span className={`status ${application.status === "approved" ? "verified" : ""}`}>
                        {application.status}
                      </span>
                    </div>
                    <p><b>Owner / Contact:</b> {application.contact_name}</p>
                    <p><b>Phone:</b> {application.phone} · <b>Email:</b> {contactEmail || "N/A"}</p>
                    <p><b>Address:</b> {application.address}</p>
                    {application.license_details && <p><b>License:</b> {application.license_details}</p>}
                    {application.services && <p><b>Services:</b> {application.services}</p>}
                    <div className="admin-actions">
                      <a className="small-btn" href={`tel:${application.phone}`}>
                        Call Shop
                      </a>
                      {contactEmail && (
                        <a
                          className="small-btn"
                          href={`mailto:${contactEmail}?subject=${encodeURIComponent(`HTI Partner Enquiry: ${application.business_name}`)}`}
                        >
                          Email Shop
                        </a>
                      )}
                      {digitsPhone.length >= 10 && (
                        <a
                          className="small-btn"
                          target="_blank"
                          rel="noreferrer"
                          href={`https://wa.me/${digitsPhone.length === 10 ? `91${digitsPhone}` : digitsPhone}`}
                        >
                          WhatsApp
                        </a>
                      )}
                      {hasCoords && (
                        <a
                          className="small-btn"
                          target="_blank"
                          rel="noreferrer"
                          href={`https://www.google.com/maps?q=${application.latitude},${application.longitude}`}
                        >
                          View on Map
                        </a>
                      )}

                      {application.status !== "approved" && (
                        <button
                          type="button"
                          className="small-btn"
                          onClick={() => review(application.id, "approved")}
                        >
                          Approve listing
                        </button>
                      )}
                      {application.status !== "rejected" && (
                        <button
                          type="button"
                          className="small-btn danger"
                          onClick={() => review(application.id, "rejected")}
                        >
                          {application.status === "approved" ? "Hide / Reject" : "Reject"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="small-btn danger"
                        onClick={() => deletePartner(application.id, application.business_name)}
                      >
                        Delete Shop
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p>No partner applications have been submitted.</p>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}