"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

function displayDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

export default function AdminScripts() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchScripts = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return null;
    const response = await apiFetch(getToken, "admin/scripts", {
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || result.message || `Could not load scripts (HTTP ${response.status}).`);
    return result.scripts;
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    let active = true;
    fetchScripts()
      .then((items) => { if (active && items) setScripts(items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load scripts."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchScripts]);

  async function upload(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const response = await apiFetch(getToken, "admin/scripts", {
        method: "POST",
        body: new FormData(form),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || result.message || `Upload failed with HTTP ${response.status}.`);
      form.reset();
      const items = await fetchScripts();
      if (items) setScripts(items);
      setSuccess("Form successfully submitted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Script upload failed.");
    } finally {
      setSaving(false);
    }
  }

  async function download(id) {
    try {
      const response = await apiFetch(getToken, `admin/scripts/${id}/file`);
      if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}.`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `hti-script-${id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not download script.");
    }
  }

  return (
    <div className="admin-box">
      <h3>Private uploaded scripts</h3>
      <p>Text files are stored privately and are never executed or served from a public URL.</p>
      {error && <p role="alert">{error}</p>}
      {success && <p role="status" className={success === "Form successfully submitted." ? "form-success-msg" : undefined}>{success}</p>}
      <form className="admin-form" onSubmit={upload}>
        <label>Text script file<input name="script" type="file" required /></label>
        <div className="wide admin-actions"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Uploading..." : "Upload private script"}</button></div>
      </form>
      {loading ? <p>Loading scripts...</p> : scripts.length === 0 ? <p>No private scripts have been uploaded.</p> : scripts.map((script) => (
        <article className="request-result" key={script.id}>
          <div className="request-result-head">
            <div><b>{script.file_name}</b><small>Uploaded by {script.uploader_name} · {displayDate(script.created_at)}</small></div>
          </div>
          <button type="button" className="small-btn" onClick={() => download(script.id)}>Download private script</button>
        </article>
      ))}
    </div>
  );
}
