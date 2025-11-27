export const metadata = { title: "Terms of Service | CalDoc India" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-12 text-slate-800">
      <h1 className="text-3xl font-semibold text-slate-900">Terms of Service</h1>
      <p className="text-sm text-slate-600">
        These highlights describe the legal expectations between CalDoc India, registered providers, and
        patients. The full contract is available on request and during onboarding.
      </p>
      <ol className="list-decimal space-y-2 pl-6 text-sm text-slate-700">
        <li>CalDoc India is a technology platform. Consultations are performed solely by licensed registered medical practitioners.</li>
        <li>Patients must provide accurate demographic, consent, and payment information before a visit.</li>
        <li>Providers agree to follow the CalDocicine Practice Guidelines 2020 and maintain medical records.</li>
        <li>Payments and refunds run through Razorpay and follow the clinic&apos;s cancellation policies.</li>
        <li>Use of this site implies acceptance of future updates to these terms.</li>
      </ol>
    </main>
  );
}
