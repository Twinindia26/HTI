import SiteShell from "../../components/site-shell";
import PatientRequests from "../../components/patient-requests";

export default function DashboardRequestsPage() {
  return (
    <SiteShell>
      <section className="section wrap">
        <div className="section-head">
          <span className="eyebrow">MY REQUESTS</span>
          <h2>My requests & <span>HTI replies.</span></h2>
          <p>Only requests linked to your signed-in account are shown.</p>
        </div>
        <PatientRequests />
      </section>
    </SiteShell>
  );
}
