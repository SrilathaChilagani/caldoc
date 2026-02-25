import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth.server";
import CheckInFormClient from "@/app/checkin/[token]/CheckInFormClient";

export const dynamic = "force-dynamic";

export default async function CheckInPreviewPage() {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login");

  return (
    <main className="min-h-screen bg-[#f7f2ea] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Preview banner */}
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>
            <strong>Preview mode</strong> — this is how patients see the check-in form. Submitting will show the success screen but save nothing.
          </span>
        </div>

        {/* Simulated header (mirrors what real patients see) */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f6ea5]">
            Pre-visit check-in
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Hi Rahul, let&apos;s get you ready
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Your appointment with{" "}
            <span className="font-medium text-slate-800">Dr. Priya Sharma</span>
            {" "}(General Medicine) is on Monday, 02 March 2026, 10:30 AM.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Completing this form helps your doctor prepare for your visit. It takes about 3 minutes.
          </p>
        </div>

        <CheckInFormClient
          appointmentId="preview"
          token="preview"
          previewMode={true}
        />
      </div>
    </main>
  );
}
