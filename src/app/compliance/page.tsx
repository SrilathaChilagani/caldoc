export const metadata = {
  title: "Compliance — TPG 2020 & DPDP Act | CalDoc India",
};

export default function CompliancePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6 lg:px-10 py-12 text-slate-800">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-500">Regulatory Compliance</p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Telemedicine Practice Guidelines 2020 &amp; DPDP Act, 2023
          </h1>
          <p className="text-sm text-slate-600">
            CalDoc India operates as a technology platform for telemedicine services and is committed to full
            compliance with the <strong>Telemedicine Practice Guidelines 2020</strong> (MoHFW, GSR 226(E)), the{" "}
            <strong>Digital Personal Data Protection Act, 2023</strong>, and all applicable provisions of the Drugs and
            Cosmetics Act, 1940. This page summarises our obligations and how we meet them.
          </p>
        </div>

        {/* TPG 2020 */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">1. Telemedicine Practice Guidelines 2020 (TPG 2020)</h2>
          <p className="text-sm text-slate-600">
            Notified by the Ministry of Health &amp; Family Welfare on 25 March 2020 under the Indian Medical Council
            (Professional Conduct, Etiquette and Ethics) Regulations, 2002, now enforced by the{" "}
            <strong>National Medical Commission (NMC)</strong>.
          </p>
          <ul className="space-y-3 text-sm text-slate-700">
            <li>
              <strong>Registered Medical Practitioners only.</strong> Every provider listed on CalDoc holds a valid
              NMC or State Medical Council registration. Registration numbers and council names are displayed on every
              booking page and appointment record.
            </li>
            <li>
              <strong>Patient identification.</strong> Patients provide their name and mobile number during booking;
              identity is further verified through WhatsApp OTP login to access the patient portal.
            </li>
            <li>
              <strong>Explicit informed consent.</strong> A mandatory consent checkbox is presented before every
              booking. Consent type, mode, text, and timestamp are stored server-side per the guidelines.
            </li>
            <li>
              <strong>Consultation modes.</strong> Video and audio-only calls are supported. Text-only communication is
              not used as the sole mode for first-time consultations involving clinical assessment.
            </li>
            <li>
              <strong>Prescription compliance.</strong> RMPs may prescribe OTC and Schedule H medicines via
              telemedicine. Schedule X (narcotic/psychotropic) drugs cannot be prescribed via telemedicine under any
              circumstances — the platform technically restricts this category.
            </li>
            <li>
              <strong>Medical records.</strong> All consultation notes, prescriptions, and consent records are retained
              for a minimum of <strong>3 years</strong> from the date of the consultation, as required under NMC
              regulations. Records are encrypted at rest and access-logged.
            </li>
            <li>
              <strong>Emergency referral.</strong> The platform prominently displays the national emergency number
              (112) and advises users to seek in-person care for emergencies. Telemedicine is not offered for
              life-threatening conditions.
            </li>
          </ul>
        </section>

        {/* DPDP */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">2. Digital Personal Data Protection Act, 2023 (DPDP)</h2>
          <ul className="space-y-3 text-sm text-slate-700">
            <li>
              <strong>Consent-first processing.</strong> Health data is collected only after explicit, informed, and
              freely given consent at the point of booking. Consent can be withdrawn by contacting{" "}
              <a href="mailto:privacy@telemed.in" className="text-blue-600 underline">privacy@telemed.in</a>.
            </li>
            <li>
              <strong>Purpose limitation.</strong> Personal and health data is used exclusively to deliver
              telemedicine care, fulfil prescriptions/lab orders, and meet statutory reporting obligations. It is never
              sold or used for advertising.
            </li>
            <li>
              <strong>Data Principal rights.</strong> You have the right to: access the data we hold, correct
              inaccuracies, request portability, and request erasure (subject to medical record retention obligations).
              Exercise these rights at{" "}
              <a href="mailto:privacy@telemed.in" className="text-blue-600 underline">privacy@telemed.in</a>.
            </li>
            <li>
              <strong>Breach notification.</strong> In the event of a personal data breach, affected users and
              CERT-In will be notified within 72 hours of us becoming aware of the incident, as required by the Act.
            </li>
            <li>
              <strong>Cross-border transfers.</strong> Data is stored on servers located in India (AWS ap-south-1).
              No personal health data is transferred outside India without explicit consent.
            </li>
          </ul>
        </section>

        {/* Prescription & Drug Compliance */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">3. Prescription &amp; Drug Schedule Compliance</h2>
          <p className="text-sm text-slate-600">
            CalDoc follows the Drugs and Cosmetics Act, 1940, and the TPG 2020 prescription rules:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-700 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-900">
                  <th className="py-2 pr-4 font-semibold">Drug Category</th>
                  <th className="py-2 pr-4 font-semibold">Can be prescribed via telemedicine?</th>
                  <th className="py-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 pr-4">OTC (Over-the-counter)</td>
                  <td className="py-2 pr-4 text-emerald-700 font-medium">Yes</td>
                  <td className="py-2">For any patient, first-time or follow-up</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Schedule H</td>
                  <td className="py-2 pr-4 text-amber-700 font-medium">Yes, with conditions</td>
                  <td className="py-2">Clinically appropriate; valid digital prescription issued</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Schedule H1</td>
                  <td className="py-2 pr-4 text-amber-700 font-medium">Follow-up only</td>
                  <td className="py-2">Requires prior in-person diagnosis; RMP discretion applies</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Schedule X (controlled)</td>
                  <td className="py-2 pr-4 text-red-700 font-medium">No — prohibited</td>
                  <td className="py-2">In-person consultation mandatory per TPG 2020</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            Rx delivery orders for Schedule H medicines require a valid prescription upload. Schedule X medicines
            cannot be dispensed through the CalDoc Rx delivery service.
          </p>
        </section>

        {/* Infrastructure */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">4. Infrastructure &amp; Security Controls</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li><strong>Encryption at rest &amp; in transit.</strong> All data is encrypted using AES-256 (database) and TLS 1.3 (network).</li>
            <li><strong>Access control.</strong> Role-based access (patient, provider, pharmacy, lab, admin) with audit logs on all privileged operations.</li>
            <li><strong>Video infrastructure.</strong> Secure video rooms via Daily.co with waiting rooms; rooms are terminated after the consultation.</li>
            <li><strong>Payments.</strong> Processed via Razorpay, a PCI-DSS Level 1 certified payment gateway. CalDoc does not store card details.</li>
            <li><strong>File storage.</strong> Prescriptions and lab reports are stored in AWS S3 (India region) with short-lived signed URLs; direct links expire within 15 minutes.</li>
          </ul>
        </section>

        {/* Grievance */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">5. Grievance Redressal</h2>
          <p className="text-sm text-slate-700">
            In accordance with the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the
            DPDP Act, 2023, CalDoc India has designated a <strong>Grievance Officer</strong>:
          </p>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 space-y-1">
            <p><strong>Grievance Officer:</strong> Compliance Team, CalDoc India</p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:grievance@telemed.in" className="text-blue-600 underline">grievance@telemed.in</a>
            </p>
            <p><strong>Response SLA:</strong> Acknowledged within 48 hours; resolved within 30 days.</p>
            <p><strong>Scope:</strong> Complaints related to data privacy, consultation quality, prescription handling, or platform conduct.</p>
          </div>
          <p className="text-xs text-slate-500">
            If you believe a registered medical practitioner has violated the TPG 2020 or professional ethics, you may
            also file a complaint directly with the{" "}
            <a
              href="https://www.nmc.org.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              National Medical Commission (NMC)
            </a>
            .
          </p>
        </section>

        <p className="text-xs text-slate-400">
          Last reviewed: March 2025. This compliance summary is updated as regulations evolve.
        </p>
      </div>
    </main>
  );
}
