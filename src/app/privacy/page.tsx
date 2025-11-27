export const metadata = { title: "Privacy Policy | CalDoc India" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-12 text-slate-800">
      <h1 className="text-3xl font-semibold text-slate-900">Privacy Policy</h1>
      <p className="text-sm text-slate-600">
        We collect only the data needed to deliver telemedicine services and fulfil regulatory duties under the
        DPDP Act. This summary explains the categories of information we store and how to contact us.
      </p>
      <ul className="space-y-2 text-sm text-slate-700">
        <li><strong>Data collected:</strong> registration details, consent, visit notes, prescriptions, fulfillment metadata.</li>
        <li><strong>Storage:</strong> encrypted databases (Postgres) and AWS S3 buckets hosted in India with access logging.</li>
        <li><strong>Sharing:</strong> only with treating providers, pharmacies, labs, or regulators as required.</li>
        <li><strong>Retention:</strong> medical records retained per local law; you may request deletion via privacy@telemed.in.</li>
      </ul>
    </main>
  );
}
