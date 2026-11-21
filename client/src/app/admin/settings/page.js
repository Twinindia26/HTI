import Link from "next/link";
import SiteShell from "../../components/site-shell";

export default function AdminSettingsPage() {
  return (
    <SiteShell>
      <section className="section wrap">
        <div className="section-head">
          <span className="eyebrow">ADMINISTRATION</span>
          <h2>Security & configuration</h2>
          <p>Server environment settings are managed outside the website. Secret keys and database credentials are never displayed here.</p>
        </div>
        <div className="admin-box">
          <h3>Administrator access</h3>
          <p>Set the server ADMIN_EMAIL to the active administrator’s verified primary email. Use the audited transfer workflow if that account needs to change.</p>
          <Link className="btn btn-primary" href="/admin-transfer">Transfer administrator access</Link>
        </div>
        <div className="admin-box">
          <h3>Operational requirements</h3>
          <p>Apply additive database migrations before using requests, profiles, partner applications, workshops, or publications.</p>
          <p>Prescription files are stored on the server’s private local volume. Configure durable, encrypted storage and tested backups before production use.</p>
          <p>Configure a Clerk webhook endpoint at <code>/api/webhooks/clerk</code> with the server signing secret to process account updates and deactivations.</p>
        </div>
      </section>
    </SiteShell>
  );
}
