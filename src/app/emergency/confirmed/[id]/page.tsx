import Link from "next/link";
import { prisma } from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmergencyConfirmedPage({ params }: PageProps) {
  const { id } = await params;

  let patientName = "there";
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      select: { patientName: true, visitMode: true },
    });
    if (appt?.patientName) {
      patientName = appt.patientName.split(" ")[0];
    }
  } catch {
    // Non-critical — show generic confirmation
  }

  return (
    <main className="flex min-h-[calc(100vh-120px)] items-center justify-center bg-[#f7f2ea] px-4 py-16">
      <div className="w-full max-w-lg text-center">
        {/* Success icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <h1 className="font-serif text-3xl font-semibold text-slate-900">
          Booking Confirmed!
        </h1>

        <p className="mt-3 text-lg text-slate-600">
          Hi {patientName}, your emergency consultation is booked.
        </p>

        {/* 5-minute promise */}
        <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5">
          <div className="flex items-center justify-center gap-2 text-rose-700">
            <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span className="text-sm font-semibold">One of our doctors will reach out to you within 5 minutes.</span>
          </div>
          <p className="mt-2 text-xs text-rose-600">
            Please keep your phone nearby. You will receive a call or WhatsApp message shortly.
          </p>
        </div>

        {/* Info cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 text-left">
          <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
            <p className="mt-1 text-sm font-medium text-slate-800">Emergency — Pending doctor assignment</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">What happens next</p>
            <p className="mt-1 text-sm font-medium text-slate-800">A doctor will call / send a video link within 5 min</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/patient/appointments/${id}`}
            className="inline-flex items-center justify-center rounded-xl bg-[#2f6ea5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#255b8b]"
          >
            Track your appointment
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to home
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Booking reference: {id}
        </p>
      </div>
    </main>
  );
}
