export const metadata = { title: "Terms of Service | CalDoc India" };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6 lg:px-10 py-12 text-slate-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">Terms of Service</h1>
          <p className="text-sm text-slate-500">
            Effective date: 1 January 2025. Last updated: March 2025. By accessing or using CalDoc India you agree to
            these terms.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">1. Platform Nature &amp; Regulatory Framework</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>
              CalDoc India is a <strong>technology platform</strong> that connects patients with independently
              practising, <strong>NMC/State Medical Council-registered medical practitioners (RMPs)</strong>. CalDoc
              is not a hospital, clinic, or healthcare provider and does not employ or supervise physicians.
            </li>
            <li>
              All telemedicine services on this platform are governed by the{" "}
              <strong>Telemedicine Practice Guidelines 2020</strong> (MoHFW, GSR 226(E), 25 March 2020), enforced by
              the <strong>National Medical Commission (NMC)</strong>.
            </li>
            <li>
              Pharmacy and lab-at-home services are governed by the Drugs and Cosmetics Act, 1940, and partner with
              licensed pharmacies and NABL/NABH-accredited laboratories.
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">2. Patient Obligations</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Provide accurate, current, and complete personal and medical information at the time of booking.</li>
            <li>Provide explicit informed consent before each teleconsultation.</li>
            <li>Disclose all relevant medical history, allergies, and current medications to the RMP.</li>
            <li>
              Use this service only for non-emergency conditions. For emergencies, call <strong>112</strong> (India)
              or visit the nearest hospital.
            </li>
            <li>Ensure you have a stable internet/cellular connection for video or audio consultations.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">3. Provider Obligations</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>
              All RMPs must maintain valid NMC or State Medical Council registrations and update CalDoc if their
              registration status changes.
            </li>
            <li>RMPs agree to comply with the Telemedicine Practice Guidelines 2020 in all consultations.</li>
            <li>RMPs must maintain patient medical records for a minimum of <strong>3 years</strong>.</li>
            <li>
              RMPs must not prescribe <strong>Schedule X drugs</strong> via telemedicine under any circumstances, in
              compliance with TPG 2020 Section 3.8.
            </li>
            <li>RMPs must refer patients to in-person care whenever clinical judgement requires it.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">4. Prescription &amp; Medication Policy</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>
              Prescriptions issued via CalDoc are digital prescriptions compliant with MoHFW ePrescription standards.
            </li>
            <li>
              <strong>Schedule X drugs</strong> (narcotic, psychotropic, and controlled substances under the Narcotic
              Drugs and Psychotropic Substances Act, 1985) cannot be prescribed or dispensed through this platform.
            </li>
            <li>
              <strong>Schedule H and H1 drugs</strong> require a valid prescription and are dispensed only by
              licensed partner pharmacies upon prescription verification.
            </li>
            <li>
              Prescription drug orders through CalDoc Rx delivery must include a valid prescription. CalDoc reserves
              the right to reject any order that cannot be verified.
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">5. Payments, Cancellations &amp; Refunds</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>All payments are processed through Razorpay (PCI-DSS Level 1 certified). CalDoc does not store payment card details.</li>
            <li>Consultation fees are collected at the time of booking. Cancellations made more than 2 hours before a scheduled slot are eligible for a full refund.</li>
            <li>Cancellations within 2 hours of the slot or no-shows may be subject to a partial or no refund, at the provider&apos;s discretion.</li>
            <li>Refunds are processed within 5–7 business days to the original payment method.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">6. Liability Limitation</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>
              CalDoc is a technology intermediary. Medical opinions, diagnoses, and prescriptions are the professional
              responsibility of the treating RMP, not of CalDoc India.
            </li>
            <li>
              CalDoc is not liable for adverse outcomes resulting from incomplete or inaccurate patient-provided
              information, or from a patient&apos;s failure to seek in-person care when advised.
            </li>
            <li>
              To the maximum extent permitted by law, CalDoc&apos;s aggregate liability for any claim shall not exceed
              the consultation fee paid for the relevant appointment.
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">7. Grievances &amp; Governing Law</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>
              Grievances may be submitted to our Grievance Officer at{" "}
              <a href="mailto:grievance@telemed.in" className="text-blue-600 underline">grievance@telemed.in</a>.
              We will acknowledge within 48 hours and resolve within 30 days.
            </li>
            <li>
              Complaints about an RMP&apos;s professional conduct may be submitted to the{" "}
              <a href="https://www.nmc.org.in" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                National Medical Commission
              </a>{" "}
              or the relevant State Medical Council.
            </li>
            <li>These terms are governed by the laws of India. Disputes are subject to the jurisdiction of courts in India.</li>
            <li>CalDoc reserves the right to update these terms with 15 days&apos; notice. Continued use implies acceptance of the revised terms.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
