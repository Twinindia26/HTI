"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const initialVital = {
  type: "heart_rate",
  value: "",
  diastolicValue: "",
  unit: "bpm",
  measuredAt: "",
};

const unitsByType = {
  heart_rate: ["bpm"],
  blood_pressure: ["mmHg"],
  spo2: ["%"],
  temperature: ["C", "F"],
  weight: ["kg", "lb"],
  height: ["cm", "in"],
  glucose: ["mg/dL", "mmol/L"],
};

function displayDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

export default function PatientHealthData() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [records, setRecords] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [vitalsDoctors, setVitalsDoctors] = useState([]);
  const [selectedDoctors, setSelectedDoctors] = useState({});
  const [vital, setVital] = useState(initialVital);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return null;
    const paths = ["patient/records", "patient/records/doctors", "patient/vitals", "patient/vitals/doctors"];
    const responses = await Promise.all(paths.map((path) => apiFetch(getToken, path, {
      cache: "no-store",
    })));
    const results = await Promise.all(responses.map(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || body.message || `Could not load health data (HTTP ${response.status}).`);
      return body;
    }));
    return results;
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    let active = true;
    fetchData()
      .then((results) => {
        if (!active || !results) return;
        setRecords(results[0].records);
        setDoctors(results[1].doctors);
        setVitals(results[2].vitals);
        setVitalsDoctors(results[3].doctors);
        setError("");
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load health data.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchData]);

  async function refresh() {
    const results = await fetchData();
    if (results) {
      setRecords(results[0].records);
      setDoctors(results[1].doctors);
      setVitals(results[2].vitals);
      setVitalsDoctors(results[3].doctors);
    }
  }

  async function uploadRecord(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const response = await apiFetch(getToken, "patient/records", {
        method: "POST",
        body: new FormData(form),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || result.message || `Upload failed with HTTP ${response.status}.`);
      form.reset();
      await refresh();
      setSuccess("Form successfully submitted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Health record upload failed.");
    } finally {
      setSaving(false);
    }
  }

  async function addVital(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!vital.measuredAt) {
      setError("Measurement date and time are required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        type: vital.type,
        value: Number(vital.value),
        unit: vital.unit,
        measuredAt: new Date(vital.measuredAt).toISOString(),
      };
      if (vital.type === "blood_pressure") body.diastolicValue = Number(vital.diastolicValue);
      const response = await apiFetch(getToken, "patient/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || result.message || `Could not save vital (HTTP ${response.status}).`);
      setVital(initialVital);
      await refresh();
      setSuccess("Form successfully submitted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save measurement.");
    } finally {
      setSaving(false);
    }
  }

  async function changeRecordAccess(recordId, doctorUserId, granted) {
    setError("");
    setSuccess("");
    try {
      const response = await apiFetch(getToken, `patient/records/${recordId}/access`, {
        method: granted ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorUserId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || result.message || "Could not update record access.");
      await refresh();
      setSuccess(granted ? "Doctor access granted for this record." : "Doctor access revoked.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update record access.");
    }
  }

  async function changeVitalsAccess(doctorUserId, granted) {
    setError("");
    setSuccess("");
    try {
      const response = await apiFetch(getToken, "patient/vitals/access", {
        method: granted ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorUserId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || result.message || "Could not update vital access.");
      await refresh();
      setSuccess(granted ? "Doctor access granted to your vitals." : "Doctor access to your vitals revoked.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update vital access.");
    }
  }

  async function downloadRecord(id) {
    try {
      const response = await apiFetch(getToken, `patient/records/${id}/file`);
      if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}.`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `hti-health-record-${id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not download record.");
    }
  }

  if (loading) return <p>Loading your health records and measurements...</p>;

  return (
    <div className="admin-box">
      <h3>Private health records</h3>
      <p>Files are private. A doctor can access a record only after you grant access to that specific record.</p>
      {error && <p role="alert">{error}</p>}
      {success && <p role="status" className={success === "Form successfully submitted." ? "form-success-msg" : undefined}>{success}</p>}
      <form className="admin-form" onSubmit={uploadRecord}>
        <label>Record title<input name="title" required maxLength="255" /></label>
        <label>Record type<select name="recordType"><option value="document">Document</option><option value="lab_result">Lab result</option><option value="imaging">Imaging</option><option value="other">Other</option></select></label>
        <label>Record date<input name="recordedAt" type="datetime-local" /></label>
        <label>Private file<input name="record" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" required /></label>
        <div className="wide admin-actions"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Uploading..." : "Upload private record"}</button></div>
      </form>
      {records.length === 0 ? <p>No health records have been added.</p> : records.map((record) => (
        <article className="request-result" key={record.id}>
          <div className="request-result-head"><div><b>{record.title}</b><small>{record.record_type} · {displayDate(record.recorded_at)}</small></div></div>
          <button type="button" className="small-btn" onClick={() => downloadRecord(record.id)}>Download private record</button>
          {record.shared_with?.length > 0 && (
            <p>Shared with: {record.shared_with.map((grant) => {
              const doctor = doctors.find((item) => Number(item.doctor_user_id) === Number(grant.doctor_user_id));
              return <span key={grant.doctor_user_id}>{doctor?.full_name || "Doctor"}{" "}
                <button type="button" className="small-btn" onClick={() => changeRecordAccess(record.id, grant.doctor_user_id, false)}>Revoke</button>{" "}
              </span>;
            })}</p>
          )}
          {doctors.length > 0 && (
            <div className="admin-actions">
              <select
                aria-label={`Choose a doctor for ${record.title}`}
                value={selectedDoctors[record.id] || doctors[0].doctor_user_id}
                onChange={(event) => setSelectedDoctors((current) => ({ ...current, [record.id]: event.target.value }))}
              >
                {doctors.map((doctor) => <option key={doctor.doctor_user_id} value={doctor.doctor_user_id}>{doctor.full_name}</option>)}
              </select>
              <button type="button" className="small-btn" onClick={() => changeRecordAccess(record.id, selectedDoctors[record.id] || doctors[0].doctor_user_id, true)}>Grant access to this record</button>
            </div>
          )}
        </article>
      ))}

      <h3>Vitals and measurements</h3>
      <p>Measurements are stored with units and measurement time. Share them with an approved doctor only when you choose.</p>
      <form className="admin-form" onSubmit={addVital}>
        <label>Measurement<select value={vital.type} onChange={(event) => {
          const type = event.target.value;
          setVital({ ...vital, type, unit: unitsByType[type][0], value: "", diastolicValue: "" });
        }}>
          <option value="heart_rate">Heart rate</option><option value="blood_pressure">Blood pressure</option>
          <option value="spo2">SpO2</option><option value="temperature">Temperature</option>
          <option value="weight">Weight</option><option value="height">Height</option><option value="glucose">Glucose</option>
        </select></label>
        <label>{vital.type === "blood_pressure" ? "Systolic value" : "Value"}<input type="number" step="0.01" required value={vital.value} onChange={(event) => setVital({ ...vital, value: event.target.value })} /></label>
        {vital.type === "blood_pressure" && <label>Diastolic value<input type="number" step="0.01" required value={vital.diastolicValue} onChange={(event) => setVital({ ...vital, diastolicValue: event.target.value })} /></label>}
        <label>Unit<select value={vital.unit} onChange={(event) => setVital({ ...vital, unit: event.target.value })}>{unitsByType[vital.type].map((unit) => <option key={unit}>{unit}</option>)}</select></label>
        <label>Measured at<input type="datetime-local" required value={vital.measuredAt} onChange={(event) => setVital({ ...vital, measuredAt: event.target.value })} /></label>
        <div className="wide admin-actions"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save measurement"}</button></div>
      </form>
      {vitals.length === 0 ? <p>No measurements have been recorded.</p> : vitals.map((item) => (
        <article className="request-result" key={item.id}>
          <b>{item.vital_type.replaceAll("_", " ")}: {item.value}{item.diastolic_value != null ? ` / ${item.diastolic_value}` : ""} {item.unit}</b>
          <small>{displayDate(item.measured_at)}</small>
        </article>
      ))}
      <h3>Vital access</h3>
      {vitalsDoctors.length === 0 ? <p>No approved doctors are currently available for sharing.</p> : vitalsDoctors.map((doctor) => (
        <article className="request-result" key={doctor.doctor_user_id}>
          <b>{doctor.full_name}</b>{" "}
          <button type="button" className="small-btn" onClick={() => changeVitalsAccess(doctor.doctor_user_id, !doctor.granted)}>
            {doctor.granted ? "Revoke access to vitals" : "Share vitals"}
          </button>
        </article>
      ))}
    </div>
  );
}
