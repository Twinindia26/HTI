"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, syncDatabaseUser } from "../lib/api";

function hasValidClerkKey() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return typeof key === "string" && key.startsWith("pk_")
    && !key.includes("your_key") && !key.includes("replace_me");
}

function AuthenticatedDoctorApplicationForm() {
  const { getToken, isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const [application, setApplication] = useState(null);
  const [message, setMessage] = useState("");
  const [statusType, setStatusType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadApplication = useCallback(async () => {
    if (!authLoaded || !userLoaded || !isSignedIn || !user?.id) {
      return;
    }
    try {
      await syncDatabaseUser(user.id, getToken);
      const response = await apiFetch(getToken, "doctor/application", { cache: "no-store" });
      if (response.ok) {
        const result = await response.json();
        setApplication(result.application || null);
      }
    } catch {
      // Ignore silent status check errors before submission
    }
  }, [authLoaded, getToken, isSignedIn, user?.id, userLoaded]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  async function submitApplication(event) {
    event.preventDefault();
    setMessage("");
    setStatusType("");

    // IMPORTANT: Read form & FormData BEFORE any `await`!
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());

    if (!authLoaded || !userLoaded || !isSignedIn || !user?.id) {
      setStatusType("error");
      setMessage("Please sign in first before submitting a doctor application.");
      return;
    }

    setSubmitting(true);
    try {
      await syncDatabaseUser(user.id, getToken);
      const response = await apiFetch(getToken, "doctor/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialization: String(raw.specialization || "").trim(),
          licenseNumber: String(raw.licenseNumber || "").trim(),
          experienceYears: Number(raw.experienceYears),
          bio: String(raw.bio || "").trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || result.message || `Submission failed (HTTP ${response.status}).`);
      }

      form.reset();
      setApplication(result.application || null);
      setStatusType("success");
      setMessage("Form successfully submitted.");
    } catch (error) {
      setStatusType("error");
      setMessage(error instanceof Error ? error.message : "Could not submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="search-panel" onSubmit={submitApplication}>
      {application && (
        <div className="admin-box" style={{ marginBottom: "1rem" }}>
          <b>Current Application Status:</b>{" "}
          <span className={`status ${application.application_status === "approved" ? "verified" : ""}`}>
            {application.application_status}
          </span>
          <p><small>Specialization: {application.specialization}</small></p>
        </div>
      )}

      <label>
        Specialization
        <input name="specialization" required maxLength="255" placeholder="e.g. Cardiology" />
      </label>
      <label>
        Medical license number
        <input name="licenseNumber" required maxLength="100" placeholder="e.g. WBMC-12345" />
      </label>
      <label>
        Years of experience
        <input name="experienceYears" type="number" min="0" max="60" required placeholder="e.g. 8" />
      </label>
      <label>
        Professional biography
        <textarea name="bio" rows="4" maxLength="5000" placeholder="Write about your practice and qualifications" />
      </label>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit for verification"}
      </button>

      {message && (
        <p
          role="status"
          className={statusType === "success" ? "form-success-msg" : "form-error-msg"}
        >
          {message}
        </p>
      )}

      <small>Applications remain patient accounts until an HTI administrator verifies the credentials.</small>
    </form>
  );
}

export default function DoctorApplicationForm() {
  if (!hasValidClerkKey()) {
    return (
      <div className="search-panel">
        <p>Doctor registration is unavailable until Clerk authentication is configured.</p>
      </div>
    );
  }
  return <AuthenticatedDoctorApplicationForm />;
}