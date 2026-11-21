"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useState } from "react";
import { getApiBaseUrl, syncDatabaseUser } from "../lib/api";

function PartnerFormCard({ partnerType, title, submitLabel, extraLabel, extraPlaceholder, fieldName }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function captureGps() {
    if (!navigator.geolocation) {
      setStatus("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("Shop GPS coordinates captured.");
      },
      () => setStatus("Could not detect GPS location."),
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("");
    if (!isLoaded || !isSignedIn || !user?.id) {
      setStatus("Please sign in first to register your shop.");
      return;
    }

    const form = event.currentTarget;
    const formData = Object.fromEntries(new FormData(form).entries());
    setSubmitting(true);
    try {
      await syncDatabaseUser(user.id, getToken);
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/partners/applications`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partnerType,
          businessName: formData.businessName,
          contactName: formData.contactName,
          phone: formData.phone,
          email: formData.email,
          postalCode: formData.postalCode,
          address: formData.address,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          [fieldName]: formData.extraDetails,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || `Submission failed (HTTP ${response.status}).`);
      }
      form.reset();
      setCoords(null);
      setStatus("Form successfully submitted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <h3>{title}</h3>
      <label>
        {partnerType === "pharmacy" ? "Pharmacy / shop name" : "Centre name"}
        <input name="businessName" required maxLength="255" />
      </label>
      <label>
        Owner / contact person
        <input name="contactName" required maxLength="255" />
      </label>
      <label>
        Mobile number
        <input name="phone" required maxLength="40" />
      </label>
      <label>
        Email address (for admin contact)
        <input name="email" type="email" maxLength="255" placeholder="shop@example.com" />
      </label>
      <label>
        PIN code
        <input name="postalCode" inputMode="numeric" maxLength="6" pattern="\d{6}" required placeholder="6-digit PIN" />
      </label>
      <label>
        Full address
        <textarea name="address" rows="2" required maxLength="2000" />
      </label>
      <label>
        {extraLabel}
        <input name="extraDetails" placeholder={extraPlaceholder} maxLength="2000" />
      </label>
      <button type="button" className="small-btn" onClick={captureGps}>
        {coords ? "GPS Location Attached ✓" : "Attach Shop GPS Location (optional)"}
      </button>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Submitting..." : submitLabel}
      </button>
      {status && <p role="status" className={status === "Form successfully submitted." ? "form-success-msg" : undefined}>{status}</p>}
    </form>
  );
}

export default function HomePartnerForms() {
  return (
    <div className="service-grid">
      <PartnerFormCard
        partnerType="pharmacy"
        title="Pharmacy Registration"
        submitLabel="Submit pharmacy request"
        extraLabel="Licence details (reference)"
        extraPlaceholder="Licence number / details"
        fieldName="licenseDetails"
      />
      <PartnerFormCard
        partnerType="diagnostic"
        title="Diagnostic Centre Registration"
        submitLabel="Submit lab request"
        extraLabel="Services offered"
        extraPlaceholder="Pathology, imaging etc."
        fieldName="services"
      />
    </div>
  );
}