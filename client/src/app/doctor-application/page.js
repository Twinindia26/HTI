import SiteShell from "../components/site-shell";
import DoctorApplicationForm from "../components/doctor-application-form";

export default function DoctorApplicationPage() {
  return (
    <SiteShell>
      <section className="finder">
        <div className="wrap finder-inner">
          <div>
            <span className="eyebrow">PROVIDER REGISTRATION</span>
            <h2>Apply to join <span>Health Twin India.</span></h2>
            <p>Submit your professional details for manual verification by the HTI team.</p>
          </div>
          <DoctorApplicationForm />
        </div>
      </section>
    </SiteShell>
  );
}
