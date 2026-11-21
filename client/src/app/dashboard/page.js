import Link from "next/link";
import SiteShell from "../components/site-shell";
import Notifications from "../components/notifications";
import PatientHealthData from "../components/patient-health-data";

export default function DashboardPage() {
  return (
    <SiteShell>
      <section className="section wrap">
        <div className="section-head">
          <span className="eyebrow">YOUR PERSONAL SPACE</span>
          <h2>Welcome to your health space.</h2>
          <p>Your requests, HTI replies and system-generated Digital Health Card are available here after sign-in.</p>
        </div>

        <div className="dashboard-toolbar">
          <div id="accountIdentity">
            <b>Your account</b>
            <span>Your account identity is available from the profile menu.</span>
          </div>
        </div>

        <div className="customer-grid">
          <div className="health-card">
            <h3>Your account</h3>
            <p>Manage your private profile and see your system-generated Health ID.</p>
            <Link href="/dashboard/health-card" className="btn btn-primary">Open profile & health card</Link>
            <p><Link href="/dashboard/requests" className="text-link">View your requests and HTI replies</Link></p>
          </div>

          <div className="dashboard-shortcuts">
            <h3>Quick services</h3>
            <Link href="/request" className="shortcut">Upload prescription or ask a question</Link>
            <Link href="/request" className="shortcut">Request medicine price information</Link>
            <Link href="/partners" className="shortcut">Find nearby pharmacy partners</Link>
            <Link href="/dashboard/health-card" className="shortcut">View Digital Health Card</Link>
          </div>
        </div>
        <Notifications />
        <PatientHealthData />
      </section>
    </SiteShell>
  );
}
