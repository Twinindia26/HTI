import SiteShell from "../components/site-shell";
import AdminTransferForm from "../components/admin-transfer-form";

export default function AdminTransferPage() {
  return (
    <SiteShell>
      <section className="finder">
        <div className="wrap finder-inner">
          <div>
            <span className="eyebrow">SECURITY</span>
            <h2>Transfer administrator access</h2>
            <p>The existing database administrator must be signed in. Set the server ADMIN_EMAIL to the replacement account’s verified primary email before submitting. The transfer is audited, and the previous administrator becomes a patient account.</p>
          </div>
          <AdminTransferForm />
        </div>
      </section>
    </SiteShell>
  );
}
