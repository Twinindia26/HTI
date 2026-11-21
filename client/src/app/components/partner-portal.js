"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useState } from "react";
import { getApiBaseUrl, syncDatabaseUser } from "../lib/api";
import PartnerFinder from "./partner-finder";

function hasValidClerkKey() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return typeof key === "string" && key.startsWith("pk_")
    && !key.includes("your_key") && !key.includes("replace_me");
}

function AuthenticatedPartnerApplication({ type, title }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [coords, setCoords] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function captureGps() {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported in your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setMessage("Shop GPS coordinates attached.");
      },
      () => setMessage("Could not access GPS location."),
    );
  }

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    if (!isLoaded || !isSignedIn || !user?.id) {
      setMessage("Sign in from the navigation menu before applying.");
      return;
    }
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    setSubmitting(true);
    try {
      await syncDatabaseUser(user.id, getToken);
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/partners/applications`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          partnerType: type,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Application failed with HTTP ${response.status}.`);
      form.reset();
      setCoords(null);
      setMessage("Form successfully submitted.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Application failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <h3>{title}</h3>
      <label>{type === "pharmacy" ? "Pharmacy / shop name" : "Centre name"}<input name="businessName" required maxLength="255" /></label>
      <label>Owner / contact person<input name="contactName" required maxLength="255" /></label>
      <label>Mobile number<input name="phone" required maxLength="40" /></label>
      <label>Email address (for admin contact)<input name="email" type="email" maxLength="255" placeholder="shop@example.com" /></label>
      <label>PIN code<input name="postalCode" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" required placeholder="6-digit PIN" /></label>
      <label>Full address<textarea name="address" rows="2" maxLength="2000" required /></label>
      {type === "pharmacy" ? (
        <label>Licence details<input name="licenseDetails" maxLength="2000" placeholder="Licence number / details" /></label>
      ) : (
        <label>Services offered<input name="services" maxLength="2000" placeholder="Pathology, imaging etc." /></label>
      )}
      <button type="button" className="small-btn" onClick={captureGps}>
        {coords ? "GPS Location Attached ✓" : "Attach Shop GPS Location (optional)"}
      </button>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit for review"}
      </button>
      {message && <p role="status" className={message === "Form successfully submitted." ? "form-success-msg" : undefined}>{message}</p>}
    </form>
  );
}

function PartnerApplication(props) {
  if (!hasValidClerkKey()) {
    return (
      <div className="contact-form">
        <h3>{props.title}</h3>
        <p>Partner applications are unavailable until Clerk authentication is configured.</p>
      </div>
    );
  }
  return <AuthenticatedPartnerApplication {...props} />;
}

export default function PartnerPortal() {
  return (
    <>
      <div className="admin-box">
        <h3>Search nearby medicine shops &amp; approved partners</h3>
        <PartnerFinder />
      </div>
      <div className="service-grid">
        <PartnerApplication type="pharmacy" title="Pharmacy Registration" />
        <PartnerApplication type="diagnostic" title="Diagnostic Centre Registration" />
      </div>
    </>
  );
}