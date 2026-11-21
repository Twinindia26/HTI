"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SiteShell from "./site-shell";
import { apiFetch } from "../lib/api";

export default function AdminPublications() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [publications, setPublications] = useState([]);
  const [draft, setDraft] = useState({ title: "", category: "", content: "", status: "draft" });
  const [reviewReasons, setReviewReasons] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPublications = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      return;
    }
    const response = await apiFetch(getToken, "admin/publications", {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Could not load publications (HTTP ${response.status}).`);
    }
    const result = await response.json();
    return result.publications;
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    let active = true;
    fetchPublications()
      .then((items) => {
        if (active && items) {
          setPublications(items);
          setError("");
        }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load publications.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchPublications]);

  async function sendPublication(path, method, body) {
    const response = await apiFetch(getToken, path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || `Publication update failed with HTTP ${response.status}.`);
    }
    const items = await fetchPublications();
    if (items) setPublications(items);
  }

  async function createPublication(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await sendPublication("admin/publications", "POST", draft);
      setDraft({ title: "", category: "", content: "", status: "draft" });
      setSuccess("Form successfully submitted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create publication.");
    }
  }

  async function savePublication(publication) {
    setError("");
    setSuccess("");
    try {
      await sendPublication(
        `admin/publications/${publication.id}`,
        "PATCH",
        {
          ...publication,
          status: publication.status === "approved"
            ? "published"
            : ["draft", "published"].includes(publication.status)
              ? publication.status
              : "draft",
        },
      );
      setSuccess("Form successfully submitted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update publication.");
    }
  }

  async function archivePublication(id) {
    setError("");
    setSuccess("");
    try {
      const response = await apiFetch(getToken, `admin/publications/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Archive failed with HTTP ${response.status}.`);
      }
      const items = await fetchPublications();
      if (items) setPublications(items);
      setSuccess("Publication archived and hidden from website.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not archive publication.");
    }
  }

  async function deletePublicationPermanently(id, title) {
    if (!window.confirm(`Permanently delete "${title}" from the database?`)) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      const response = await apiFetch(getToken, `admin/publications/${id}/permanent`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Delete failed with HTTP ${response.status}.`);
      }
      const items = await fetchPublications();
      if (items) setPublications(items);
      setSuccess("Publication permanently deleted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete publication.");
    }
  }

  async function reviewPublication(id, decision) {
    setError("");
    setSuccess("");
    const reason =
      reviewReasons[id]?.trim() ||
      (decision === "approved" ? "Approved for publication." : "");
    if (!reason) {
      setError("Enter a rejection reason before rejecting a publication.");
      return;
    }
    try {
      const response = await apiFetch(getToken, `admin/publications/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || result.message || `Review failed with HTTP ${response.status}.`);
      }
      const items = await fetchPublications();
      if (items) setPublications(items);
      setSuccess(
        decision === "approved"
          ? "Publication approved and published on the frontend!"
          : "Publication rejected. The doctor was notified with the rejection reason.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not review publication.");
    }
  }

  function updatePublication(id, key, value) {
    setPublications((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  }

  return (
    <SiteShell>
      <section className="admin-app">
        <header className="admin-top">
          <div className="brand">
            <img src="/images/hti-logo.png" alt="HTI" />
            <span>
              <b>HTI <em>Admin</em></b>
              <small>Content management</small>
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
            <Link href="/admin/partners" className="side-link">Partner requests</Link>
            <Link href="/admin/articles" className="side-link active">Publications</Link>
            <Link href="/admin/workshops" className="side-link">Workshops</Link>
            <Link href="/admin/settings" className="side-link">Settings</Link>
          </aside>
          <div className="admin-content">
            <div className="admin-heading">
              <div>
                <span className="eyebrow">CONTROL CENTRE</span>
                <h1>Publication &amp; doctor blog management</h1>
              </div>
            </div>
            {error && <p role="alert" className="form-error-msg">{error}</p>}
            {success && <p role="status" className="form-success-msg">{success}</p>}

            <div className="admin-box">
              <h3>Create publication</h3>
              <form className="admin-form" onSubmit={createPublication}>
                <label>
                  Article title
                  <input
                    required
                    maxLength="255"
                    value={draft.title}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  />
                </label>
                <label>
                  Category
                  <input
                    maxLength="100"
                    value={draft.category}
                    onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={draft.status}
                    onChange={(event) => setDraft({ ...draft, status: event.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </label>
                <label className="wide">
                  Content
                  <textarea
                    required
                    rows="5"
                    maxLength="50000"
                    value={draft.content}
                    onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                  />
                </label>
                <div className="wide admin-actions">
                  <button type="submit" className="btn btn-primary">Save publication</button>
                </div>
              </form>
            </div>

            {loading ? (
              <p>Loading publications...</p>
            ) : (
              publications
                .filter((item) => !item.archived_at)
                .map((publication) => {
                  if (publication.doctor_id && publication.status === "pending") {
                    return (
                      <div key={publication.id} className="admin-box admin-form">
                        <label>
                          Article title
                          <input value={publication.title} readOnly />
                        </label>
                        <label>
                          Doctor
                          <input value={publication.doctor_name || ""} readOnly />
                        </label>
                        <label>
                          Category
                          <input value={publication.category || ""} readOnly />
                        </label>
                        <label className="wide">
                          Content
                          <textarea rows="5" value={publication.content || ""} readOnly />
                        </label>
                        <label className="wide">
                          Review / rejection reason (required if rejecting)
                          <textarea
                            rows="3"
                            maxLength="2000"
                            placeholder="Write reason if rejecting, or optional approval note..."
                            value={reviewReasons[publication.id] || ""}
                            onChange={(event) =>
                              setReviewReasons((current) => ({
                                ...current,
                                [publication.id]: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <div className="wide admin-actions">
                          <button
                            type="button"
                            className="small-btn"
                            onClick={() => reviewPublication(publication.id, "approved")}
                          >
                            Approve &amp; Publish
                          </button>
                          <button
                            type="button"
                            className="small-btn danger"
                            onClick={() => reviewPublication(publication.id, "rejected")}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            className="small-btn danger"
                            onClick={() => deletePublicationPermanently(publication.id, publication.title)}
                          >
                            Delete Permanently
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (publication.doctor_id && publication.status === "rejected") {
                    return (
                      <article key={publication.id} className="admin-box">
                        <div className="request-result-head">
                          <div>
                            <b>{publication.title}</b>
                            <small>Doctor: {publication.doctor_name || "Doctor"} · {publication.category || "General"}</small>
                          </div>
                          <span className="status">Rejected</span>
                        </div>
                        <p>{publication.content}</p>
                        {(publication.rejection_reason || publication.review_reason) && (
                          <div className="reply-panel">
                            <b>Rejection reason:</b>
                            <p>{publication.rejection_reason || publication.review_reason}</p>
                          </div>
                        )}
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="small-btn danger"
                            onClick={() => deletePublicationPermanently(publication.id, publication.title)}
                          >
                            Delete Permanently
                          </button>
                        </div>
                      </article>
                    );
                  }

                  return (
                    <form
                      key={publication.id}
                      className="admin-box admin-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        savePublication(publication);
                      }}
                    >
                      {publication.doctor_id && (
                        <p className="wide">
                          <b>Doctor Blog ({publication.doctor_name || "Doctor"})</b> — Status: {publication.status}
                        </p>
                      )}
                      <label>
                        Article title
                        <input
                          required
                          maxLength="255"
                          value={publication.title}
                          onChange={(event) => updatePublication(publication.id, "title", event.target.value)}
                        />
                      </label>
                      <label>
                        Category
                        <input
                          maxLength="100"
                          value={publication.category || ""}
                          onChange={(event) => updatePublication(publication.id, "category", event.target.value)}
                        />
                      </label>
                      <label>
                        Status
                        <select
                          value={
                            publication.status === "approved" || publication.status === "published"
                              ? "published"
                              : "draft"
                          }
                          onChange={(event) => updatePublication(publication.id, "status", event.target.value)}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                        </select>
                      </label>
                      <label className="wide">
                        Content
                        <textarea
                          required
                          rows="5"
                          maxLength="50000"
                          value={publication.content || ""}
                          onChange={(event) => updatePublication(publication.id, "content", event.target.value)}
                        />
                      </label>
                      {publication.review_reason && (
                        <p className="wide">Review note: {publication.review_reason}</p>
                      )}
                      <div className="wide admin-actions">
                        <button type="submit" className="small-btn">Update</button>
                        <button
                          type="button"
                          className="small-btn danger"
                          onClick={() => archivePublication(publication.id)}
                        >
                          Archive
                        </button>
                        <button
                          type="button"
                          className="small-btn danger"
                          onClick={() => deletePublicationPermanently(publication.id, publication.title)}
                        >
                          Delete Permanently
                        </button>
                      </div>
                    </form>
                  );
                })
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}