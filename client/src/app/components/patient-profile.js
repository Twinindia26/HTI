"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { getApiBaseUrl } from "../lib/api";

export default function PatientProfile() {
  const { getToken } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ phone: "", date_of_birth: "", address: "" });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/patient/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Could not load profile (HTTP ${response.status}).`);
      const result = await response.json();
      if (active) {
        setProfile(result.profile);
        setForm({
          phone: result.profile.phone || "",
          date_of_birth: result.profile.date_of_birth || "",
          address: result.profile.address || "",
        });
      }
    }
    loadProfile()
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load profile.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [getToken]);

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    setSaved(false);
    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/patient/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Profile update failed with HTTP ${response.status}.`);
      setProfile((current) => ({ ...current, ...result.profile }));
      setSaved("Form successfully submitted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile update failed.");
    }
  }

  if (loading) return <p>Loading your profile...</p>;
  if (error && !profile) return <p role="alert">{error}</p>;

  return (
    <>
      <div className="health-card">
        <div className="health-card-head">
          <img src="/images/hti-logo.png" alt="HTI" />
          <div><b>Health Twin India</b><small>Digital Health Card</small></div>
          <span className="pill">ACTIVE</span>
        </div>
        <div className="health-card-body">
          <div>
            <small>Cardholder</small>
            <h3>{profile?.full_name}</h3>
            <small>HTI Health ID</small>
            <strong>{profile?.health_card_id}</strong>
            <small>Account</small>
            <span>{profile?.email}</span>
          </div>
          <div className="qr-wrap"><div className="qr-fallback">HTI</div><small>Keep this ID for account support</small></div>
        </div>
        <div className="health-card-foot">One Platform. One Health Journey. <span>System generated</span></div>
      </div>
      <div className="admin-box">
        <h3>Personal profile</h3>
        <p>Only add contact and profile details you want Health Twin India to retain.</p>
        <form className="admin-form" onSubmit={saveProfile}>
          <label>Full name<input value={profile?.full_name || ""} readOnly /></label>
          <label>Email<input value={profile?.email || ""} readOnly /></label>
          <label>Phone<input maxLength="40" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label>Date of birth<input type="date" value={form.date_of_birth} onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })} /></label>
          <label className="wide">Address<textarea rows="3" maxLength="1000" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
          <div className="wide admin-actions"><button type="submit" className="btn btn-primary">Save profile</button></div>
        </form>
        {saved && <p role="status" className="form-success-msg">{saved}</p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </>
  );
}
