"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useState } from "react";
import { getApiBaseUrl, syncDatabaseUser } from "../lib/api";

function hasValidClerkKey() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return typeof key === "string" && key.startsWith("pk_")
    && !key.includes("your_key") && !key.includes("replace_me");
}

function AuthenticatedAdminTransferForm() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    if (!isLoaded || !isSignedIn || !user?.id) {
      setMessage("Sign in as the current administrator first.");
      return;
    }

    setSubmitting(true);
    try {
      await syncDatabaseUser(user.id, getToken);
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/admin/transfer`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ newAdminEmail: email }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Transfer failed with HTTP ${response.status}.`);
      }
      setMessage("Form successfully submitted.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Administrator transfer failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="search-panel" onSubmit={submit}>
      <label>Replacement administrator email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? "Transferring..." : "Transfer administrator role"}</button>
      {message && <p role="status" className={message === "Form successfully submitted." ? "form-success-msg" : undefined}>{message}</p>}
    </form>
  );
}

export default function AdminTransferForm() {
  return hasValidClerkKey()
    ? <AuthenticatedAdminTransferForm />
    : <p>Administrator transfer is unavailable until Clerk authentication is configured.</p>;
}
