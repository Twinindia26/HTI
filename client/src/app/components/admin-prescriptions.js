"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SiteShell from "./site-shell";
import { getApiBaseUrl } from "../lib/api";

function displayDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

export default function AdminPrescriptions({ requestType = null }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [requests, setRequests] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctors, setSelectedDoctors] = useState({});
  const [replies, setReplies] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const visibleRequests = requestType
    ? requests.filter((request) => request.request_type === requestType)
    : requests;

  const fetchData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      return;
    }
    const token = await getToken();
    const [reqRes, docRes] = await Promise.all([
      fetch(`${getApiBaseUrl()}/admin/prescriptions`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
      fetch(`${getApiBaseUrl()}/admin/prescriptions/doctors`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
    ]);

    if (!reqRes.ok) {
      throw new Error(`Could not load requests (HTTP ${reqRes.status}).`);
    }
    const reqJson = await reqRes.json();
    const docJson = docRes.ok ? await docRes.json() : { doctors: [] };
    return { requests: reqJson.requests || [], doctors: docJson.doctors || [] };
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    let active = true;
    fetchData()
      .then((data) => {
        if (active && data) {
          setRequests(data.requests);
          setDoctors(data.doctors);
          setError("");
        }
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Could not load requests.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [fetchData]);

  async function updateRequest(requestId, endpoint, body) {
    setError("");
    setSuccess("");
    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/admin/prescriptions/${requestId}/${endpoint}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || `Update failed with HTTP ${response.status}.`);
    }
    const data = await fetchData();
    if (data) setRequests(data.requests);
    setSuccess("Form successfully submitted.");
  }

  async function deleteRequest(requestId) {
    if (!window.confirm(`Permanently delete prescription request #${requestId}?`)) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/admin/prescriptions/${requestId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Delete failed with HTTP ${response.status}.`);
      }
      const data = await fetchData();
      if (data) setRequests(data.requests);
      setSuccess("Prescription request deleted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete prescription.");
    }
  }

  async function changeDoctorAccess(requestId, doctorUserId, grant) {
    setError("");
    setSuccess("");
    if (!doctorUserId) {
      setError("Please select a verified doctor first.");
      return;
    }
    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/admin/prescriptions/${requestId}/access`, {
        method: grant ? "PUT" : "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ doctorUserId: Number(doctorUserId) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || `Access update failed (HTTP ${response.status}).`);
      }
      const data = await fetchData();
      if (data) setRequests(data.requests);
      setSuccess(grant ? "Doctor access granted for this prescription." : "Doctor access revoked.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update doctor access.");
    }
  }

  async function downloadFile(requestId) {
    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/admin/prescriptions/${requestId}/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`File download failed with HTTP ${response.status}.`);
      }
      const fileUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `hti-prescription-${requestId}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "File download failed.");
    }
  }

  return (
    <SiteShell>
      <section className="admin-app">
        <header className="admin-top">
          <div className="brand">
            <img src="/images/hti-logo.png" alt="HTI" />
            <span>
              <b>HTI <em>Admin</em></b>
              <small>Prescription verification &amp; access</small>
            </span>
          </div>
          <Link href="/" className="btn btn-outline">Exit admin</Link>
        </header>
        <div className="admin-layout">
          <aside className="admin-side">
            <h3>Workspace</h3>
            <Link href="/admin" className="side-link">Dashboard</Link>
            <Link href="/admin/prescriptions" className={`side-link ${!requestType ? "active" : ""}`}>Prescription requests</Link>
            <Link href="/admin/prices" className={`side-link ${requestType === "price" ? "active" : ""}`}>Price enquiries</Link>
            <Link href="/admin/doctors" className="side-link">Doctor applications</Link>
            <Link href="/admin/partners" className="side-link">Partner requests</Link>
            <Link href="/admin/articles" className="side-link">Publications</Link>
            <Link href="/admin/workshops" className="side-link">Workshops</Link>
            <Link href="/admin/settings" className="side-link">Settings</Link>
          </aside>
          <div className="admin-content">
            <div className="admin-heading">
              <div>
                <span className="eyebrow">CONTROL CENTRE</span>
                <h1>{requestType === "price" ? "Medicine price enquiries" : "Prescription requests & replies"}</h1>
              </div>
              <button
                type="button"
                className="small-btn"
                onClick={() =>
                  fetchData()
                    .then((data) => {
                      if (data) {
                        setRequests(data.requests);
                        setDoctors(data.doctors);
                      }
                    })
                    .catch((cause) => setError(cause.message))
                }
              >
                Refresh
              </button>
            </div>
            {error && <p role="alert" className="form-error-msg">{error}</p>}
            {success && <p role="status" className="form-success-msg">{success}</p>}
            {loading ? (
              <p>Loading requests...</p>
            ) : visibleRequests.length === 0 ? (
              <p>No requests have been submitted.</p>
            ) : (
              <div className="admin-box">
                {visibleRequests.map((request) => (
                  <article key={request.id} className="request-result">
                    <div className="request-result-head">
                      <div>
                        <b>#{request.id} · {request.patient_name}</b>
                        <small>{request.patient_email} · {displayDate(request.created_at)}</small>
                      </div>
                      <span className={`status ${request.status === "replied" ? "verified" : ""}`}>
                        {request.status}
                      </span>
                    </div>
                    <p>
                      <b>{request.request_type === "price" ? "Price enquiry" : "Prescription clarification"}:</b>{" "}
                      {request.medicine_name}
                    </p>
                    <p>{request.message}</p>
                    {request.has_file && (
                      <button type="button" className="small-btn" onClick={() => downloadFile(request.id)}>
                        Download prescription file
                      </button>
                    )}

                    <div className="reply-panel" style={{ marginTop: "0.75rem" }}>
                      <b>Doctor Access (Private Sharing)</b>
                      <p>
                        <small>
                          Only the patient, Admin, and doctors explicitly granted access below can view this prescription.
                        </small>
                      </p>
                      {Array.isArray(request.shared_doctors) && request.shared_doctors.length > 0 && (
                        <div className="admin-actions" style={{ marginBottom: "0.5rem" }}>
                          {request.shared_doctors.map((doc) => (
                            <span key={doc.doctor_user_id} className="status verified">
                              Dr. {doc.full_name}{" "}
                              <button
                                type="button"
                                className="small-btn danger"
                                style={{ marginLeft: "0.4rem", padding: "0.1rem 0.4rem" }}
                                onClick={() => changeDoctorAccess(request.id, doc.doctor_user_id, false)}
                              >
                                Revoke
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {doctors.length > 0 ? (
                        <div className="admin-actions">
                          <select
                            value={selectedDoctors[request.id] || ""}
                            onChange={(event) =>
                              setSelectedDoctors((prev) => ({ ...prev, [request.id]: event.target.value }))
                            }
                          >
                            <option value="">Select verified doctor...</option>
                            {doctors.map((doc) => (
                              <option key={doc.doctor_user_id} value={doc.doctor_user_id}>
                                {doc.full_name} {doc.specialization ? `(${doc.specialization})` : ""}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="small-btn"
                            onClick={() => changeDoctorAccess(request.id, selectedDoctors[request.id], true)}
                          >
                            Grant Doctor Access
                          </button>
                        </div>
                      ) : (
                        <small>No verified doctors available yet.</small>
                      )}
                    </div>

                    <form
                      className="admin-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        updateRequest(request.id, "reply", {
                          reply: replies[request.id] ?? request.admin_reply ?? "",
                        }).catch((cause) => setError(cause.message));
                      }}
                    >
                      <label className="wide">
                        HTI reply
                        <textarea
                          rows="3"
                          maxLength="5000"
                          value={replies[request.id] ?? request.admin_reply ?? ""}
                          onChange={(event) =>
                            setReplies((current) => ({ ...current, [request.id]: event.target.value }))
                          }
                        />
                      </label>
                      <div className="wide admin-actions">
                        <button type="submit" className="btn btn-primary">Save reply</button>
                        {request.status === "pending" && (
                          <button
                            type="button"
                            className="small-btn"
                            onClick={() =>
                              updateRequest(request.id, "status", { status: "reviewing" }).catch((cause) =>
                                setError(cause.message),
                              )
                            }
                          >
                            Mark reviewing
                          </button>
                        )}
                        {request.status !== "closed" && (
                          <button
                            type="button"
                            className="small-btn"
                            onClick={() =>
                              updateRequest(request.id, "status", { status: "closed" }).catch((cause) =>
                                setError(cause.message),
                              )
                            }
                          >
                            Close
                          </button>
                        )}
                        <button
                          type="button"
                          className="small-btn danger"
                          onClick={() => deleteRequest(request.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </form>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}