import Link from "next/link";
import SiteShell from "../components/site-shell";

const services = [
  { title: "Prescription Solution", text: "Upload a prescription and ask our team for clarification or medicine information.", tone: "tint-green", icon: "?" },
  { title: "Medicine Price Identification", text: "Request a price check. HTI reviews the enquiry and publishes an updated response.", tone: "tint-blue", icon: "?" },
  { title: "Find Medicine Near Me", text: "Search approved pharmacy partners by PIN code or location and contact them directly.", tone: "tint-purple", icon: "?" },
  { title: "Digital Health Card", text: "Get a system-generated HTI Health Card ID and QR code after signing in.", tone: "tint-orange", icon: "?" },
  { title: "Health Records", text: "Personal prescription and report organisation tools are being developed.", tone: "tint-mint", icon: "+" },
  { title: "Publications & Masterclasses", text: "Read educational articles and discover upcoming workshops and learning sessions.", tone: "tint-sky", icon: "?" },
];

export default function ServicesPage() {
  return (
    <SiteShell>
      <section className="section wrap">
        <div className="section-head">
          <span className="eyebrow">WHAT WE OFFER</span>
          <h2>Healthcare assistance, <span>when you need it.</span></h2>
          <p>Choose a service, submit your application and receive updates through your signed-in account.</p>
        </div>
        <div className="service-grid">
          {services.map((service) => (
            <article key={service.title} className={`service-card ${service.tone}`}>
              <div className="service-icon">{service.icon}</div>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
              <Link href="/request" className="text-link">Apply for service ?</Link>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
