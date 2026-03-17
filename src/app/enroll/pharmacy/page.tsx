import PharmacyEnrollmentForm from "./PharmacyEnrollmentForm";

export const metadata = { title: "Join CalDoc as a Pharmacy Partner" };

export default function PharmacyEnrollPage() {
  return (
    <main className="min-h-screen bg-[#f7f2ea] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f6ea5]">Partner Enrollment</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Join CalDoc as a Pharmacy</h1>
          <p className="mt-2 text-sm text-slate-600">
            Complete this form to apply as a pharmacy partner. Our team will review within 2–3 business days.
          </p>
        </div>
        <PharmacyEnrollmentForm />
      </div>
    </main>
  );
}
