import EnrollmentFormClient from "./EnrollmentFormClient";

export const metadata = {
  title: "Join CalDoc as a Provider",
  description: "Apply to practice telemedicine on CalDoc. Takes about 5 minutes.",
};

export default function EnrollPage() {
  return (
    <main className="min-h-screen bg-[#f7f2ea] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f6ea5]">
            Provider Enrollment
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            Join CalDoc as a Doctor
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Complete this form to apply for a provider account. Our team will review your
            application within 2–3 business days and reach out with next steps.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              MoHFW Telemedicine Guidelines 2020 compliant
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2f6ea5]" />
              Takes about 5 minutes
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Documents uploaded securely to S3
            </span>
          </div>
        </div>

        <EnrollmentFormClient />
      </div>
    </main>
  );
}
