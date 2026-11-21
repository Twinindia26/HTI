import SiteShell from "../components/site-shell";

const steps = [
  { number: "01", title: "Sign in & submit", text: "Sign in securely with Clerk and choose a service." },
  { number: "02", title: "HTI reviews", text: "Our team checks the request and verifies available information." },
  { number: "03", title: "HTI replies", text: "An authorised team member reviews your request and responds." },
  { number: "04", title: "View in your account", text: "Sign in again with the same account to see your reply and request status." },
];

export default function HowItWorksPage() {
  return (
    <SiteShell>
      <section className="section wrap">
        <div className="section-head">
          <span className="eyebrow">SIMPLE BY DESIGN</span>
          <h2>How Health Twin India works</h2>
        </div>
        <div className="steps">
          {steps.map((step) => (
            <div key={step.number}>
              <b>{step.number}</b>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
