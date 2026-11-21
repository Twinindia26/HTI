import SiteShell from "../components/site-shell";
import DoctorWorkspace from "../components/doctor-workspace";

export default function DoctorPage() {
  return (
    <SiteShell>
      <section className="section wrap">
        <div className="section-head">
          <span className="eyebrow">DOCTOR WORKSPACE</span>
          <h2>Professional <span>dashboard</span></h2>
          <p>Manage your educational publications. Submissions remain unpublished until administrator review.</p>
        </div>
        <DoctorWorkspace />
      </section>
    </SiteShell>
  );
}
