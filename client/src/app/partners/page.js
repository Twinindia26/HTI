import Link from "next/link";
import SiteShell from "../components/site-shell";
import PartnerPortal from "../components/partner-portal";

export default function PartnersPage() {
  return (
    <SiteShell>
      <section className="section wrap">
        <div className="section-head">
          <span className="eyebrow">GROW WITH HTI</span>
          <h2>Register as a <span>healthcare partner.</span></h2>
          <p>Pharmacies and diagnostic centres can submit a request to join the HTI partner network. Listings appear only after admin verification and approval.</p>
        </div>
        <PartnerPortal />
        <p className="note">Submitting a registration does not guarantee approval. After approval, your business name, phone, address, PIN code and services are visible in the public directory.</p>
        <p className="note">Are you a clinician? <Link href="/doctor-application" className="text-link">Apply for provider verification</Link>.</p>
      </section>
    </SiteShell>
  );
}
