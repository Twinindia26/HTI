import SiteShell from "../components/site-shell";
import PublishedWorkshops from "../components/published-workshops";

export default function WorkshopsPage() {
  return (
    <SiteShell>
      <section className="section wrap">
        <div className="section-head">
          <span className="eyebrow">LEARN WITH HTI</span>
          <h2>Masterclasses & workshops</h2>
          <p>Discover upcoming sessions and practical learning opportunities.</p>
        </div>
        <PublishedWorkshops />
      </section>
    </SiteShell>
  );
}
