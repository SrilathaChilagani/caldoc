import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyCheckinToken } from "@/lib/checkinToken";
import CheckInFormClient from "./CheckInFormClient";

type PageProps = { params: Promise<{ token: string }> };

function formatSlot(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function CheckInPage({ params }: PageProps) {
  const { token } = await params;

  const payload = verifyCheckinToken(token);
  if (!payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f2ea] px-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-100 bg-white p-8 shadow-lg">
          <h1 className="text-xl font-semibold text-rose-700">Link expired or invalid</h1>
          <p className="mt-2 text-sm text-slate-600">
            This check-in link is no longer valid. Please contact your care coordinator or the clinic
            for a new link.
          </p>
        </div>
      </main>
    );
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: payload.appointmentId },
    select: {
      id: true,
      patientName: true,
      patient: { select: { name: true } },
      provider: { select: { name: true, speciality: true } },
      slot: { select: { startsAt: true } },
      checkInForm: { select: { completedAt: true } },
    },
  });

  if (!appointment) return notFound();

  if (appointment.checkInForm?.completedAt) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f2ea] px-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Check-in complete</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your pre-visit form has already been submitted. Your doctor will review it before your
            appointment.
          </p>
          {appointment.slot?.startsAt && (
            <p className="mt-4 rounded-xl bg-[#f7f2ea] px-4 py-3 text-sm font-medium text-[#2f6ea5]">
              {formatSlot(appointment.slot.startsAt)}
            </p>
          )}
        </div>
      </main>
    );
  }

  const patientName = appointment.patientName || appointment.patient?.name || "";
  const providerName = appointment.provider?.name || "your doctor";
  const speciality = appointment.provider?.speciality || "";
  const slotLabel = appointment.slot?.startsAt ? formatSlot(appointment.slot.startsAt) : "";

  return (
    <main className="min-h-screen bg-[#f7f2ea] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f6ea5]">
            Pre-visit check-in
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {patientName ? `Hi ${patientName.split(" ")[0]}, let's get you ready` : "Pre-visit check-in"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Your appointment with{" "}
            <span className="font-medium text-slate-800">Dr. {providerName}</span>
            {speciality ? ` (${speciality})` : ""}
            {slotLabel ? ` is on ${slotLabel}` : ""}.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Completing this form helps your doctor prepare for your visit. It takes about 3 minutes.
          </p>
        </div>

        <CheckInFormClient appointmentId={appointment.id} token={token} />
      </div>
    </main>
  );
}
