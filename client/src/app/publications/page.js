import SiteShell from "../components/site-shell";
import PublishedPublications from "../components/published-publications";

export default function PublicationsPage() {
  return (
    <SiteShell>
      <section className="section wrap">
        <div className="section-head">
          <span className="eyebrow">KNOWLEDGE & LEARNING</span>
          <h2>Learn. Discover. <span>Grow.</span></h2>
          <p>Explore healthcare awareness, research insights, articles and professional learning opportunities.</p>
        </div>
        <PublishedPublications />
      </section>
    </SiteShell>
  );
}
