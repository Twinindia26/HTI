"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SiteShell from "./site-shell";
import { getApiBaseUrl } from "../lib/api";

function localDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AdminWorkshops() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [workshops, setWorkshops] = useState([]);
  const [draft, setDraft] = useState({ title: "", description: "", starts_at: "", mode: "Online", status: "draft" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchWorkshops = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/admin/workshops`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Could not load workshops (HTTP ${response.status}).`);
    const result = await response.json();
    return result.workshops.map((item) => ({ ...item, starts_at: localDateTime(item.starts_at) }));
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    let active = true;
    fetchWorkshops()
      .then((items) => { if (active && items) setWorkshops(items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load workshops."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchWorkshops]);

  async function send(url, method, values) {
    const token = await getToken();
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, startsAt: new Date(values.starts_at).toISOString() }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || `Workshop update failed with HTTP ${response.status}.`);
    }
    const items = await fetchWorkshops();
    if (items) setWorkshops(items);
  }

  async function create(event) {
    event.preventDefault();
    setSuccess("");
    try {
      await send(`${getApiBaseUrl()}/admin/workshops`, "POST", draft);
      setDraft({ title: "", description: "", starts_at: "", mode: "Online", status: "draft" });
      setSuccess("Form successfully submitted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create workshop.");
    }
  }

  async function archive(id) {
    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/admin/workshops/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Archive failed with HTTP ${response.status}.`);
      const items = await fetchWorkshops();
      if (items) setWorkshops(items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not archive workshop.");
    }
  }

  function updateWorkshop(id, key, value) {
    setWorkshops((current) => current.map((item) => item.id === id ? { ...item, [key]: value } : item));
  }

  return (
    <SiteShell>
      <section className="admin-app">
        <header className="admin-top"><div className="brand"><img src="/images/hti-logo.png" alt="HTI" /><span><b>HTI <em>Admin</em></b><small>Workshop management</small></span></div><Link href="/" className="btn btn-outline">Exit admin</Link></header>
        <div className="admin-layout">
          <aside className="admin-side">
            <h3>Workspace</h3>
            <Link href="/admin" className="side-link">Dashboard</Link>
            <Link href="/admin/prescriptions" className="side-link">Prescription requests</Link>
            <Link href="/admin/doctors" className="side-link">Doctor applications</Link>
            <Link href="/admin/partners" className="side-link">Partner requests</Link>
            <Link href="/admin/articles" className="side-link">Publications</Link>
            <Link href="/admin/workshops" className="side-link active">Workshops</Link>
          </aside>
          <div className="admin-content">
            <div className="admin-heading"><div><span className="eyebrow">CONTROL CENTRE</span><h1>Workshop management</h1></div></div>
            {error && <p role="alert">{error}</p>}
            {success && <p role="status" className="form-success-msg">{success}</p>}
            <div className="admin-box">
              <h3>Create workshop / masterclass</h3>
              <form className="admin-form" onSubmit={create}>
                <label>Title<input required maxLength="255" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
                <label>Date / schedule<input type="datetime-local" required value={draft.starts_at} onChange={(event) => setDraft({ ...draft, starts_at: event.target.value })} /></label>
                <label>Mode<input required maxLength="40" value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value })} /></label>
                <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="draft">Draft</option><option value="published">Published</option></select></label>
                <label className="wide">Description<textarea required rows="3" maxLength="10000" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
                <div className="wide admin-actions"><button type="submit" className="btn btn-primary">Save workshop</button></div>
              </form>
            </div>
            {loading ? <p>Loading workshops...</p> : workshops.map((workshop) => (
              <form
                key={workshop.id}
                className="admin-box admin-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSuccess("");
                  send(`${getApiBaseUrl()}/admin/workshops/${workshop.id}`, "PATCH", workshop)
                    .then(() => setSuccess("Form successfully submitted."))
                    .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not update workshop."));
                }}
              >
                <label>Title<input required maxLength="255" value={workshop.title} onChange={(event) => updateWorkshop(workshop.id, "title", event.target.value)} /></label>
                <label>Date / schedule<input type="datetime-local" required value={workshop.starts_at} onChange={(event) => updateWorkshop(workshop.id, "starts_at", event.target.value)} /></label>
                <label>Mode<input required maxLength="40" value={workshop.mode} onChange={(event) => updateWorkshop(workshop.id, "mode", event.target.value)} /></label>
                <label>Status<select value={workshop.status} onChange={(event) => updateWorkshop(workshop.id, "status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label>
                <label className="wide">Description<textarea required rows="3" maxLength="10000" value={workshop.description} onChange={(event) => updateWorkshop(workshop.id, "description", event.target.value)} /></label>
                <div className="wide admin-actions"><button type="submit" className="small-btn">Update</button><button type="button" className="small-btn danger" onClick={() => archive(workshop.id)}>Archive</button></div>
              </form>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
