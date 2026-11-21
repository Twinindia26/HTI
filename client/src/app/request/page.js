import SiteShell from "../components/site-shell";
import RequestForm from "../components/request-form";

export default function RequestPage() {
  return (
    <SiteShell>
      <section className="finder">
        <div className="wrap finder-inner">
          <div>
            <span className="eyebrow">SEND A REQUEST TO HTI</span>
            <h2>How can we help you?</h2>
            <p>Submit a prescription clarification or medicine price enquiry. Our team will review your request and reply in your customer account.</p>
            <div className="admin-box">
              <b>How it works</b>
              <p>1. Sign in ? 2. Submit your request ? 3. HTI reviews it ? 4. Admin replies ? 5. View the response in your account.</p>
            </div>
          </div>
          <RequestForm />
        </div>
      </section>
    </SiteShell>
  );
}
