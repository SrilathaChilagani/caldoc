export const metadata = {
  title: "Compliance & DPDP | CalDoc India",
};

export default function CompliancePage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-12 text-slate-800">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-500">Compliance</p>
        <h1 className="text-3xl font-semibold text-slate-900">Digital Personal Data Protection (DPDP) readiness</h1>
        <p className="text-sm text-slate-600">
          CalDoc India follows the TELEMEDICINE Practice Guidelines 2020 and the DPDP Act, 2023. This page
          summarises how we collect, process, and protect personal data across the platform.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">How we protect patient data</h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          <li><strong>Consent-first workflows.</strong> Every booking captures explicit consent, and patients can withdraw consent from their profile.</li>
          <li><strong>Purpose limitation.</strong> Health data is only used for providing care, fulfillment, and regulatory reports.</li>
          <li><strong>Retention controls.</strong> Records are encrypted at rest (Postgres + S3) with lifecycle policies; you may request deletion via privacy@telemed.in.</li>
          <li><strong>Audit trails.</strong> Administrative actions, prescriptions, fulfillment updates, and WhatsApp notifications are logged.</li>
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Your DPDP rights</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-slate-700">
          <li>Right to access and confirm what data we hold.</li>
          <li>Right to correction, portability, and erasure (subject to medical record obligations).</li>
          <li>Right to grievance redressal via <a className="text-blue-600 underline" href="mailto:privacy@telemed.in">privacy@telemed.in</a>.</li>
          <li>Right to nominate a representative to exercise these rights.</li>
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Infrastructure controls</h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          <li>S3 uploads/downloads use short-lived signed URLs with access logging.</li>
          <li>Video visits use Daily.co rooms with waiting rooms; payments run through Razorpay (PCI-DSS).</li>
          <li>Secrets stay in environment variables; staff accounts use role-based access (provider vs admin/pharmacy).</li>
        </ul>
      </section>
    </main>
  );
}
