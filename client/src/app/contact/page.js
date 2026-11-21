import SiteShell from "../components/site-shell";

export default function ContactPage() {
  return (
    <SiteShell>
      <section className="contact-section wrap">
        <div>
          <span className="eyebrow">WE'RE HERE TO HELP</span>
          <h2>Connect with Health Twin India</h2>
          <p>For service enquiries, partnerships, publications or workshops, send us a message.</p>
          <p className="contact-email">? healthtwinindia@gmail.com</p>
        </div>
        <form className="contact-form">
          <label>Your name<input required placeholder="Full name" /></label>
          <label>Email<input type="email" required placeholder="Email address" /></label>
          <label>How can we help?<select><option>General enquiry</option><option>Partnership</option><option>Publication / Workshop</option></select></label>
          <label>Message<textarea required rows="3" placeholder="Write your message" /></label>
          <button type="submit" className="btn btn-primary">Prepare enquiry ?</button>
          <small>Demo form: connect a secure backend or email service before publishing.</small>
        </form>
      </section>
    </SiteShell>
  );
}
