import SiteShell from "../../components/site-shell";
import PatientProfile from "../../components/patient-profile";

export default function HealthCardPage() {
  return (
    <SiteShell>
      <section className="section wrap">
        <div className="section-head">
          <span className="eyebrow">DIGITAL HEALTH CARD</span>
          <h2>Your <span>HTI health card</span></h2>
          <p>Get a system-generated HTI Health Card ID and QR code after signing in.</p>
        </div>
        <PatientProfile />
      </section>
    </SiteShell>
  );
}
