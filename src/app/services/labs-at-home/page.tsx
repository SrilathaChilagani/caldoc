import LabHomeForm from "./ui/LabHomeForm";

const LAB_TEST_OPTIONS = [
  "Complete blood count (CBC)",
  "Comprehensive metabolic panel (CMP)",
  "Lipid profile",
  "HbA1c",
  "Thyroid panel",
  "Vitamin D",
  "Urinalysis",
  "Liver function test",
  "Kidney function test",
  "CRP",
  "Ferritin",
  "Electrolytes",
];

export const metadata = {
  title: "Labs at home | CalDoc",
};

export default function LabsAtHomePage() {
  return (
    <main className="bg-gradient-to-b from-white via-[#f5fff9] to-white py-16">
      <div className="mx-auto max-w-4xl space-y-10 px-6">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">Labs at home</p>
          <h1 className="text-3xl font-semibold text-slate-900">Book doorstep sample collection</h1>
          <p className="text-sm text-slate-500">
            Select the tests you need, share your contact details, and pay securely. Our labs team will confirm pickup via
            WhatsApp.
          </p>
        </header>
        <section className="rounded-[32px] bg-white p-8 shadow-xl ring-1 ring-slate-100">
          <LabHomeForm options={LAB_TEST_OPTIONS} />
        </section>
      </div>
    </main>
  );
}
