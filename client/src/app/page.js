import Link from "next/link";
import SiteShell from "./components/site-shell";
import RequestForm from "./components/request-form";
import PartnerFinder from "./components/partner-finder";
import HomePartnerForms from "./components/home-partner-forms";

const serviceCards = [
  { title: "Prescription Solution", text: "Upload a prescription and ask our team for clarification or medicine information.", tone: "tint-green", icon: "+", link: "/request" },
  { title: "Medicine Price Identification", text: "Request a price check. HTI reviews the enquiry and publishes an updated response.", tone: "tint-blue", icon: "-", link: "/request" },
  { title: "Find Medicine Near Me", text: "Search approved pharmacy partners by PIN code or location and contact them directly.", tone: "tint-purple", icon: "*", link: "/#partnerFinder" },
  { title: "Digital Health Card", text: "Get a system-generated HTI Health Card ID and QR code after signing in.", tone: "tint-orange", icon: "#", link: "/dashboard/health-card" },
  { title: "Health Records", text: "Organise personal prescriptions, reports, and vitals in your account.", tone: "tint-mint", icon: "+", link: "/dashboard" },
  { title: "Publications & Masterclasses", text: "Read educational articles and discover upcoming workshops and learning sessions.", tone: "tint-sky", icon: "?", link: "/publications" },
];

const steps = [
  { number: "01", title: "Sign in & submit", text: "Sign in securely with Clerk and choose a service." },
  { number: "02", title: "HTI reviews", text: "Our team checks the request and verifies available information." },
  { number: "03", title: "HTI replies", text: "An authorised team member reviews your request and responds." },
  { number: "04", title: "View in your account", text: "Sign in again with the same account to see your reply and request status." },
];

export default function HomePage() {
  return (
    <SiteShell>
      <div className="wrap hero">
        <div className="hero-copy">
          <span className="eyebrow"><i></i> YOUR CONNECTED HEALTHCARE PARTNER</span>
          <h1>
            One platform for
            <br />
            <span>your health journey.</span>
          </h1>
          <p>
            Upload a prescription for clarification, request medicine price information,
            discover nearby pharmacies and diagnostic centres, and access healthcare learning
            resources in one place.
          </p>
          <div className="hero-actions">
            <Link href="/services" className="btn btn-primary">
              Explore services
            </Link>
            <Link href="/how-it-works" className="btn btn-outline">
              See how it works
            </Link>
          </div>
          <div className="trust-row">
            <span>• User-request based</span>
            <span>• Human-reviewed responses</span>
            <span>• Partner registration</span>
          </div>
        </div>

        <div className="hero-art" aria-label="HTI health dashboard preview">
          <div className="art-glow"></div>
          <div className="phone">
            <div className="phone-top">
              <span>9:41</span>
              <span>• • •</span>
            </div>
            <img src="/images/hti-logo.png" alt="HTI" />
            <b>Your health space</b>
            <div className="phone-tile">
              + <span>Upload prescription</span>
            </div>
            <div className="phone-tile">
              - <span>Request medicine price</span>
            </div>
            <div className="phone-tile">
              * <span>Find pharmacy / lab</span>
            </div>
            <div className="phone-tile">
              # <span>Digital health card</span>
            </div>
            <small>One Platform. One Health Journey.</small>
          </div>
          <div className="float-icon fi1">+</div>
          <div className="float-icon fi2">-</div>
          <div className="float-icon fi3">*</div>
          <div className="art-caption">
            <b>Healthcare, connected.</b>
            <small>Designed around everyday needs</small>
          </div>
        </div>
      </div>

      <section className="wrap value-strip">
        <div>
          <b>•</b>
          <span>
            <strong>User driven</strong>
            <small>Service requests</small>
          </span>
        </div>
        <div>
          <b>•</b>
          <span>
            <strong>Human reviewed</strong>
            <small>Clarifications &amp; prices</small>
          </span>
        </div>
        <div>
          <b>•</b>
          <span>
            <strong>Partner network</strong>
            <small>Pharmacy &amp; lab</small>
          </span>
        </div>
        <div>
          <b>•</b>
          <span>
            <strong>Personal space</strong>
            <small>Request updates</small>
          </span>
        </div>
      </section>

      <section className="section wrap" id="services">
        <div className="section-head">
          <span className="eyebrow">WHAT WE OFFER</span>
          <h2>
            Healthcare assistance, <span>when you need it.</span>
          </h2>
          <p>
            Choose a service, submit your application and receive updates through your signed-in account.
          </p>
        </div>

        <div className="service-grid">
          {serviceCards.map((card) => (
            <article key={card.title} className={`service-card ${card.tone}`}>
              <div className="service-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
              <Link href={card.link} className="text-link">
                Open service
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="finder">
        <div className="wrap finder-inner">
          <div>
            <span className="eyebrow">SEND A REQUEST TO HTI</span>
            <h2>How can we help you?</h2>
            <p>
              Submit a prescription clarification or medicine price enquiry. Our team will review your request and reply in your customer account. No medicine catalogue is preloaded or manually listed.
            </p>
            <div className="admin-box">
              <b>How it works</b>
              <p>1. Sign in 2. Submit your request 3. HTI reviews it 4. HTI replies 5. View the response in your account.</p>
            </div>
          </div>

          <RequestForm />
        </div>
      </section>

      <section className="section wrap" id="partnerFinder">
        <div className="section-head">
          <span className="eyebrow">PARTNER DISCOVERY</span>
          <h2>
            Find a nearby <span>pharmacy partner.</span>
          </h2>
          <p>
            Search approved HTI partner listings by PIN code or use your live location. Please call the pharmacy to confirm medicine stock and current price.
          </p>
        </div>

        <PartnerFinder />
      </section>

      <section className="section wrap">
        <div className="section-head">
          <span className="eyebrow">YOUR PERSONAL SPACE</span>
          <h2>Your personal health space.</h2>
          <p>
            Sign in to view your requests, HTI replies and personal health features.
          </p>
        </div>

        <div className="dashboard-toolbar">
          <div id="accountIdentity">
            <b>Personal account</b>
            <span>Your account details appear after sign-in.</span>
          </div>
        </div>

        <div className="customer-grid">
          <div className="health-card">
            <div className="health-card-head">
              <img src="/images/hti-logo.png" alt="HTI" />
              <div>
                <b>Health Twin India</b>
                <small>Digital Health Card</small>
              </div>
              <span className="pill">PREVIEW</span>
            </div>
            <div className="health-card-body">
              <div>
                <small>Cardholder</small>
                <h3>Your name</h3>
                <small>HTI Health ID</small>
                <strong>Generated after sign-in</strong>
                <small>Account</small>
                <span id="cardEmail">Available after sign-in</span>
              </div>
              <div className="qr-wrap">
                <div className="qr-fallback">HTI</div>
                <small>Your card is created for your account</small>
              </div>
            </div>
            <div className="health-card-foot">
              One Platform. One Health Journey. <span>System generated</span>
            </div>
          </div>

          <div className="dashboard-shortcuts">
            <h3>Quick services</h3>
            <Link href="/request" className="shortcut">
              + Upload prescription
            </Link>
            <Link href="/request" className="shortcut">
              - Request medicine price
            </Link>
            <Link href="/#partnerFinder" className="shortcut">
              * Find nearby pharmacy
            </Link>
            <Link href="/dashboard/health-card" className="shortcut">
              # View Digital Health Card
            </Link>
          </div>
        </div>
      </section>

      <section className="section wrap" id="how">
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

      <section className="section wrap" id="partners">
        <div className="section-head">
          <span className="eyebrow">GROW WITH HTI</span>
          <h2>
            Register as a <span>healthcare partner.</span>
          </h2>
          <p>
            Pharmacies and diagnostic centres can submit a request to join the HTI partner network. Listings appear only after admin verification and approval.
          </p>
        </div>

        <HomePartnerForms />

        <p className="note">
          Submitting a registration does not guarantee approval or public listing. HTI will review the details before activation.
        </p>
      </section>

      <section className="learning" id="publications">
        <div className="wrap learning-inner">
          <div>
            <span className="eyebrow">KNOWLEDGE &amp; LEARNING</span>
            <h2>
              Learn. Discover. <span>Grow.</span>
            </h2>
            <p>
              Explore healthcare awareness, research insights, articles and professional learning opportunities.
            </p>
            <Link href="/publications" className="btn btn-primary">
              Browse publications
            </Link>
          </div>

          <div className="learning-card">
            <div className="book-art">+</div>
            <span className="pill">HTI PUBLICATIONS</span>
            <h3>Knowledge for a healthier tomorrow</h3>
            <p>
              Read articles curated for students, professionals and the wider healthcare community.
            </p>
            <div className="content-list">
              <div>
                <b>Approved articles appear in Publications.</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section wrap" id="workshops">
        <div className="section-head">
          <span className="eyebrow">LEARN WITH HTI</span>
          <h2>Masterclasses &amp; workshops</h2>
          <p>Discover upcoming sessions and practical learning opportunities.</p>
        </div>

        <div className="workshop-grid">
          <article className="workshop-card">
            <span className="date">UPDATES COMING SOON</span>
            <h3>Upcoming learning sessions</h3>
            <p>New masterclasses and workshops will be announced here.</p>
          </article>
        </div>
      </section>

      <section className="about-band" id="about">
        <div className="wrap about-inner">
          <div className="about-mark">
            <img src="/images/hti-logo.png" alt="Health Twin India" />
          </div>
          <div>
            <span className="eyebrow">ABOUT HEALTH TWIN INDIA</span>
            <h2>One Platform. One Health Journey.</h2>
            <p>
              Our vision is to build a connected digital healthcare ecosystem that makes healthcare information, medicine discovery and personal health organisation easier to access.
            </p>
            <p className="note">
              HTI is an information and connection platform. It does not replace medical advice, prescriptions or direct pharmacy confirmation.
            </p>
          </div>
        </div>
      </section>

      <section className="contact-section wrap" id="contact">
        <div>
          <span className="eyebrow">WE&apos;RE HERE TO HELP</span>
          <h2>Connect with Health Twin India</h2>
          <p>
            For service enquiries, partnerships, publications or workshops, send us a message.
          </p>
          <p className="contact-email">healthtwinindia@gmail.com</p>
        </div>

        <form className="contact-form">
          <label>
            Your name
            <input required placeholder="Full name" />
          </label>
          <label>
            Email
            <input type="email" required placeholder="Email address" />
          </label>
          <label>
            How can we help?
            <select>
              <option>General enquiry</option>
              <option>Partnership</option>
              <option>Publication / Workshop</option>
            </select>
          </label>
          <label>
            Message
            <textarea required rows="3" placeholder="Write your message" />
          </label>
          <button type="submit" className="btn btn-primary">
            Prepare enquiry
          </button>
          <small>Demo form: connect a secure backend or email service before publishing.</small>
        </form>
      </section>
    </SiteShell>
  );
}