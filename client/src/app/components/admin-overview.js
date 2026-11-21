"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SiteShell from "./site-shell";
import { apiFetch } from "../lib/api";
import AdminScripts from "./admin-scripts";
import AdminHealthRecords from "./admin-health-records";

export default function AdminOverview() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  const fetchOverview = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return null;
    const response = await apiFetch(getToken, "admin/overview", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Could not load dashboard (HTTP ${response.status}).`);
    const result = await response.json();
    return result.overview;
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    let active = true;
    fetchOverview()
      .then((data) => { if (active && data) setOverview(data); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load dashboard."); });
    return () => { active = false; };
  }, [fetchOverview]);

  const stats = overview ? [
    { label: "Registered accounts", value: overview.total_users },
    { label: "Total requests", value: overview.total_requests },
    { label: "Pending requests", value: overview.pending_requests },
    { label: "Pending doctor applications", value: overview.pending_doctor_applications },
    { label: "Pending partner applications", value: overview.pending_partner_applications },
    { label: "Pending doctor publications", value: overview.pending_publications },
    { label: "Published content", value: overview.published_content },
    { label: "Upcoming workshops", value: overview.upcoming_workshops },
  ] : [];

  return (
    <SiteShell>
      <section className="admin-app">
        <header className="admin-top">
          <div className="brand"><img src="/images/hti-logo.png" alt="HTI" /><span><b>HTI <em>Admin</em></b><small>Request & partner management</small></span></div>
          <Link href="/" className="btn btn-outline">Exit admin</Link>
        </header>
        <div className="admin-layout">
          <aside className="admin-side">
            <h3>Workspace</h3>
            <Link href="/admin" className="side-link active">Dashboard</Link>
            <Link href="/admin/prescriptions" className="side-link">Prescription requests</Link>
            <Link href="/admin/prices" className="side-link">Price enquiries</Link>
            <Link href="/admin/doctors" className="side-link">Doctor applications</Link>
            <Link href="/admin/partners" className="side-link">Partner requests</Link>
            <Link href="/admin/articles" className="side-link">Publications</Link>
            <Link href="/admin/workshops" className="side-link">Workshops</Link>
            <Link href="/admin/settings" className="side-link">Settings</Link>
          </aside>
          <div className="admin-content">
            <div className="admin-heading"><div><span className="eyebrow">CONTROL CENTRE</span><h1>Dashboard overview</h1></div></div>
            {error && <p role="alert">{error}</p>}
            {!overview && !error ? <p>Loading dashboard...</p> : (
              <>
                <div className="stat-grid">{stats.map((stat) => <div key={stat.label} className="stat"><small>{stat.label}</small><b>{stat.value}</b></div>)}</div>
                <div className="admin-box">
                  <h3>Work queues</h3>
                  <p><Link href="/admin/prescriptions">Review and reply to patient requests.</Link></p>
                  <p><Link href="/admin/doctors">Verify provider applications.</Link></p>
                  <p><Link href="/admin/partners">Approve pharmacy and diagnostic listings.</Link></p>
                  <p><Link href="/admin/articles">Manage educational publications.</Link></p>
                  <p><Link href="/admin/workshops">Schedule workshops and masterclasses.</Link></p>
                </div>
                <AdminScripts />
                <AdminHealthRecords />
              </>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
