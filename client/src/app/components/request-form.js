"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useState } from "react";
import { getApiBaseUrl, syncDatabaseUser } from "../lib/api";

function hasValidClerkKey() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return typeof key === "string" && key.startsWith("pk_")
    && !key.includes("your_key") && !key.includes("replace_me");
}

function UnavailableRequestForm() {
  return (
    <div className="search-panel">
      <p>Request submission is unavailable until Clerk authentication is configured.</p>
    </div>
  );
}

function AuthenticatedRequestForm() {
  const { getToken, isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestType, setRequestType] = useState("prescription");

  async function submitRequest(event) {
    event.preventDefault();
    setMessage("");
    if (!authLoaded || !userLoaded || !isSignedIn || !user?.id) {
      setMessage("Sign in using the navigation button before submitting a request.");
      return;
    }

    const form = event.currentTarget;
    const values = new FormData(form);
    setSubmitting(true);
    try {
      await syncDatabaseUser(user.id, getToken);
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/patient/requests`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: values,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Request submission failed with HTTP ${response.status}.`);
      }
      form.reset();
      setRequestType("prescription");
      setMessage("Form successfully submitted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="search-panel" onSubmit={submitRequest}>
      <label>
        Request type
        <select
          name="requestType"
          value={requestType}
          onChange={(event) => setRequestType(event.target.value)}
        >
          <option value="prescription">Prescription clarification</option>
          <option value="price">Medicine price enquiry</option>
        </select>
      </label>
      <label>
        Medicine name
        <input name="medicineName" maxLength="255" required placeholder="Enter medicine name" />
      </label>
      <label>
        Message
        <textarea name="message" rows="3" maxLength="5000" required placeholder="Write your question or clarification needed" />
      </label>
      <label>
        Prescription file (optional)
        <input
          name="prescription"
          type="file"
          accept=".pdf,image/jpeg,image/png,image/webp"
          disabled={requestType !== "prescription"}
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit request"}
      </button>
      {message && <p role="status" className={message === "Form successfully submitted." ? "form-success-msg" : undefined}>{message}</p>}
      <small>Only PDF, JPEG, PNG, or WebP files up to 10 MB are accepted.</small>
    </form>
  );
}

export default function RequestForm() {
  return hasValidClerkKey() ? <AuthenticatedRequestForm /> : <UnavailableRequestForm />;
}
