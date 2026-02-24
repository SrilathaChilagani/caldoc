export const metadata = {
  title: "Telemedicine Disclaimer | CalDoc India",
};

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-12 text-sm text-zinc-800">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">Legal Notice</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Teleconsultation Disclaimer</h1>
          <p className="text-xs text-zinc-500">
            Issued in accordance with the <strong>Telemedicine Practice Guidelines 2020</strong> notified by the
            Ministry of Health &amp; Family Welfare, Government of India on 25 March 2020 (GSR 226(E)), under the
            Indian Medical Council (Professional Conduct, Etiquette and Ethics) Regulations, 2002, now administered by
            the <strong>National Medical Commission (NMC)</strong>.
          </p>
        </div>

        {/* Emergency warning */}
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="font-semibold text-red-800">This platform is NOT for emergencies</p>
          <p className="mt-1 text-red-700">
            If you or someone else is experiencing a life-threatening situation — including severe chest pain,
            difficulty breathing, loss of consciousness, major bleeding, stroke, or poisoning — stop and call:
          </p>
          <ul className="mt-2 space-y-1 font-semibold text-red-800">
            <li>📞 <strong>112</strong> — National Emergency Number (India)</li>
            <li>📞 <strong>102</strong> — Ambulance (India)</li>
            <li>📞 <strong>100</strong> — Police (India)</li>
            <li>📞 Or your local emergency number if outside India</li>
          </ul>
          <p className="mt-2 text-red-700">Visit the nearest hospital immediately. Do not wait for a telemedicine response.</p>
        </div>

        {/* Nature of service */}
        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-900">1. Nature of the Service</h2>
          <p>
            CalDoc India is a <strong>technology platform</strong> that facilitates remote medical consultations
            between patients and independently practising, NMC/State Medical Council-registered medical practitioners
            (&quot;RMPs&quot;). CalDoc is not a healthcare provider and does not employ or directly supervise
            physicians.
          </p>
          <p>
            Consultations are conducted via audio call or video call as chosen by the patient. All RMPs on this
            platform hold valid registrations with the National Medical Commission or a recognised State Medical
            Council as required under the Telemedicine Practice Guidelines 2020.
          </p>
        </section>

        {/* Limitations */}
        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-900">2. Limitations of Telemedicine</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              A physician cannot perform a physical examination remotely. Clinical judgement is based solely on the
              information, images, or documents you share.
            </li>
            <li>
              The treating RMP may determine at any point that an in-person visit, laboratory investigation, or
              imaging is necessary and will communicate this to you.
            </li>
            <li>
              Telemedicine is not a substitute for emergency or critical care services.
            </li>
            <li>
              Connectivity issues (bandwidth, audio/video quality) may affect the quality of the consultation.
            </li>
          </ul>
        </section>

        {/* Prescription rules */}
        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-900">3. Prescription &amp; Medication Rules</h2>
          <p>Under the Telemedicine Practice Guidelines 2020 and the Drugs and Cosmetics Act, 1940:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Over-the-counter (OTC) medicines</strong> may be recommended for any patient.
            </li>
            <li>
              <strong>Schedule H and H1 drugs</strong> (prescription-only medicines) may be prescribed by the RMP for
              follow-up patients or where clinically appropriate. A valid digital prescription will be issued.
            </li>
            <li>
              <strong>Schedule X drugs</strong> (narcotic, psychotropic, and other controlled substances) <em>cannot</em>{" "}
              be prescribed via telemedicine under any circumstances. An in-person consultation is mandatory for these
              medications.
            </li>
            <li>
              Prescriptions issued through this platform comply with the ePrescription standards notified by the
              Ministry of Health &amp; Family Welfare.
            </li>
          </ul>
        </section>

        {/* Patient responsibilities */}
        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-900">4. Patient Responsibilities</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Provide accurate, complete, and current medical history, including all current medications and allergies.</li>
            <li>Disclose any pre-existing conditions or recent hospitalisations relevant to the consultation.</li>
            <li>Ensure a private, secure environment during the consultation to protect your own confidentiality.</li>
            <li>Follow the RMP&apos;s advice and seek in-person care if directed to do so.</li>
          </ul>
        </section>

        {/* Consent and data */}
        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-900">5. Consent &amp; Data Privacy</h2>
          <p>
            By completing a booking on this platform you provide <strong>explicit informed consent</strong> to
            teleconsultation and to the collection and processing of your health data for the purposes of providing
            medical care, as required under the DPDP Act, 2023. Your data will not be sold or used for advertising.
            Refer to our{" "}
            <a href="/privacy" className="text-blue-600 underline">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="/compliance" className="text-blue-600 underline">
              Compliance Page
            </a>{" "}
            for full details.
          </p>
        </section>

        {/* Grievance */}
        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-900">6. Complaints &amp; Grievances</h2>
          <p>
            To raise a complaint about a consultation or data handling, contact our Grievance Officer at{" "}
            <a href="mailto:grievance@telemed.in" className="text-blue-600 underline">
              grievance@telemed.in
            </a>
            . Complaints will be acknowledged within 48 hours and resolved within 30 days as required by the IT
            (Intermediary Guidelines) Rules, 2021 and the DPDP Act, 2023.
          </p>
        </section>

        <p className="border-t border-zinc-200 pt-4 text-xs text-zinc-400">
          Last reviewed: March 2025. This disclaimer is subject to revision as regulations are updated. Continued use
          of the platform constitutes acceptance of the current version.
        </p>
      </div>
    </main>
  );
}
