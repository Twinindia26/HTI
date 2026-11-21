import SiteShell from "../components/site-shell";

export default function AboutPage() {
  return (
    <SiteShell>
      <section className="about-band">
        <div className="wrap about-inner">
          <div className="about-mark">
            <img src="/images/hti-logo.png" alt="Health Twin India" />
          </div>
          <div>
            <span className="eyebrow">ABOUT HEALTH TWIN INDIA</span>
            <h2>One Platform. One Health Journey.</h2>
            <p>Our vision is to build a connected digital healthcare ecosystem that makes healthcare information, medicine discovery and personal health organisation easier to access.</p>
            <p className="note">HTI is an information and connection platform. It does not replace medical advice, prescriptions or direct pharmacy confirmation.</p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
