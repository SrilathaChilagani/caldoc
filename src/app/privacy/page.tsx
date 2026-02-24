export const metadata = { title: "Privacy Policy | CalDoc India" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6 lg:px-10 py-12 text-slate-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">Privacy Policy</h1>
          <p className="text-sm text-slate-500">
            Effective date: 1 January 2025. Last updated: March 2025. Compliant with the{" "}
            <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> and applicable health data
            regulations.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">1. Data We Collect</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li><strong>Identity &amp; contact:</strong> name, mobile number, and (optionally) email at registration.</li>
            <li><strong>Health data:</strong> symptoms, consultation notes, diagnoses, prescriptions, and lab reports shared during or after a visit.</li>
            <li><strong>Consent records:</strong> timestamp, consent text, and mode of consent captured at booking.</li>
            <li><strong>Transaction data:</strong> payment references, order IDs, and fulfilment metadata for pharmacy and lab orders.</li>
            <li><strong>Usage data:</strong> IP address, device type, and page interaction logs collected for security and debugging.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">2. Why We Process Your Data</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>To provide telemedicine consultations and share records with your treating RMP.</li>
            <li>To fulfil prescription and lab-at-home orders with licensed partner facilities.</li>
            <li>To send appointment confirmations and follow-up reminders via WhatsApp/SMS.</li>
            <li>To meet statutory reporting and audit obligations under Indian law.</li>
            <li>To detect, prevent, and respond to fraud or security incidents.</li>
          </ul>
          <p className="text-sm text-slate-700">
            Health data is <strong>never sold, rented, or shared for advertising purposes</strong>.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">3. Data Sharing</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li><strong>Treating RMPs:</strong> your clinical data is shared with the physician you consult.</li>
            <li><strong>Partner pharmacies &amp; labs:</strong> order and prescription data is shared only with the licensed facility fulfilling your order.</li>
            <li><strong>Regulators:</strong> data may be disclosed to NMC, MoHFW, CERT-In, or law enforcement when required by law.</li>
            <li><strong>Payment processor:</strong> Razorpay receives transaction data necessary to process payments; CalDoc does not receive or store card details.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">4. Data Retention</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>
              <strong>Medical records</strong> (consultation notes, prescriptions, consent records) are retained for a
              minimum of <strong>3 years</strong> from the consultation date, as required under NMC regulations and
              the Indian Medical Council (Professional Conduct, Etiquette and Ethics) Regulations, 2002.
            </li>
            <li><strong>Transaction records</strong> are retained for 7 years for tax and audit compliance.</li>
            <li>
              <strong>Account and usage data</strong> is retained until you request deletion, subject to the above
              mandatory retention periods.
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">5. Your Rights Under DPDP Act, 2023</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li><strong>Right of access:</strong> request a copy of the personal data we hold about you.</li>
            <li><strong>Right of correction:</strong> request correction of inaccurate or incomplete data.</li>
            <li><strong>Right of erasure:</strong> request deletion of your data (subject to mandatory retention obligations).</li>
            <li><strong>Right to withdraw consent:</strong> withdraw consent to processing at any time; this will affect your ability to use the platform.</li>
            <li><strong>Right to nominate:</strong> nominate a representative to exercise these rights on your behalf.</li>
          </ul>
          <p className="text-sm text-slate-700">
            Exercise any of these rights by emailing{" "}
            <a href="mailto:privacy@telemed.in" className="text-blue-600 underline">privacy@telemed.in</a>.
            Requests will be acknowledged within 48 hours and fulfilled within 30 days.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">6. Security &amp; Breach Notification</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>All data is encrypted at rest (AES-256) and in transit (TLS 1.3).</li>
            <li>Servers are located in India (AWS ap-south-1). No health data is transferred outside India.</li>
            <li>Access is restricted by role; all privileged actions are audit-logged.</li>
            <li>
              In the event of a personal data breach that is likely to result in harm to Data Principals, we will
              notify affected users and CERT-In within <strong>72 hours</strong> of becoming aware of the breach, as
              required by the DPDP Act, 2023.
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">7. Grievance Officer</h2>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 space-y-1">
            <p><strong>Grievance Officer:</strong> Compliance Team, CalDoc India</p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:grievance@telemed.in" className="text-blue-600 underline">grievance@telemed.in</a>
            </p>
            <p>
              <strong>Data / Privacy queries:</strong>{" "}
              <a href="mailto:privacy@telemed.in" className="text-blue-600 underline">privacy@telemed.in</a>
            </p>
            <p><strong>Response SLA:</strong> Acknowledged within 48 hours; resolved within 30 days.</p>
          </div>
        </section>

        <p className="text-xs text-slate-400">
          Last reviewed: March 2025. This policy is updated as regulations evolve. Continued use of the platform
          constitutes acceptance of the current version.
        </p>
      </div>
    </main>
  );
}
