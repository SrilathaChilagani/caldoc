// src/app/visit/[id]/page.tsx
import { prisma } from "@/lib/db";
import { ensureVideoRoomIfNeeded } from "@/lib/videoLinkHelpers";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>; // Next 16 app router uses async params
  searchParams?: Promise<{ from?: string }>;
};

function fmtIST(d: Date) {
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function appBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

export default async function VisitPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const fromParam = sp.from === "provider" ? "provider" : null;
  const backHref = fromParam ? "/provider/appointments" : "/";

  // Get appointment with relationships that are guaranteed to exist
  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: {
      provider: true,
      patient: true,
      slot: { select: { startsAt: true } },
      payment: { select: { status: true } },
    },
  });

  if (!appt) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">Appointment not found</h1>
        <Link className="text-blue-600 underline" href={backHref}>Go home</Link>
      </main>
    );
  }

  const whenDate = appt.slot?.startsAt ? new Date(appt.slot.startsAt) : appt.createdAt;
  const whenIST = fmtIST(whenDate);
  const rmpInfo = {
    qualification: appt.provider?.qualification || "Not provided",
    registrationNumber: appt.provider?.registrationNumber || "Not provided",
    councilName: appt.provider?.councilName || "Not provided",
  };

  let videoRoom: string | null | undefined = appt.videoRoom;
  if (
    !videoRoom &&
    appt.visitMode !== "AUDIO" &&
    appt.payment?.status === "CAPTURED"
  ) {
    try {
      videoRoom = await ensureVideoRoomIfNeeded(
        appt.id,
        {
          visitMode: appt.visitMode,
          videoRoom: appt.videoRoom,
          slotStartsAt: appt.slot?.startsAt ?? null,
          forceImmediate: true,
        },
        appBaseUrl(),
      );
    } catch (err) {
      console.error("visit page video room ensure error", err);
    }
  }

  const patientPortalHref =
    appt.patient?.phone
      ? `/patient/login?next=${encodeURIComponent("/patient/appointments")}&phone=${encodeURIComponent(
          appt.patient.phone,
        )}`
      : "/patient/login";
  const isAudioVisit = appt.visitMode === "AUDIO";
  const patientPhoneDisplay = appt.patient?.phone ? appt.patient.phone.replace(/\s+/g, "") : null;

  return (
    <main className="min-h-[calc(100vh-140px)] bg-gradient-to-b from-[#eef4ff] via-white to-white py-12">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 sm:px-6 lg:px-10">
        <div className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-slate-100 md:p-8">
          <div className="mb-4">
            <Link
              href={backHref}
              className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              ← Back home
            </Link>
          </div>
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Your visit details</h1>
              <p className="text-sm text-slate-500">Appointment ID: <span className="font-mono text-slate-700">{appt.id}</span></p>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                appt.status === "CONFIRMED"
                  ? "bg-emerald-50 text-emerald-700"
                  : appt.status === "CANCELLED"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {appt.status}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Provider</p>
              <p className="text-lg font-semibold text-slate-900">{appt.provider?.name ?? "—"}</p>
              <p className="text-xs text-slate-500">
                Patient: {appt.patientName || appt.patient?.name || "—"}
              </p>
              <dl className="mt-3 text-xs text-slate-500 space-y-1">
                <div>
                  <dt className="font-semibold text-slate-600">Qualification</dt>
                  <dd>{rmpInfo.qualification}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-600">RMP registration</dt>
                  <dd>{rmpInfo.registrationNumber}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-600">Council</dt>
                  <dd>{rmpInfo.councilName}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">When</p>
              <p className="text-lg font-semibold text-slate-900">{whenIST} IST</p>
              <p className="text-xs text-slate-500">
                Delivery option: {appt.deliveryOpt ? appt.deliveryOpt : "Prescription will be sent to your phone"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {isAudioVisit ? (
              <span className="text-sm text-slate-500">
                This is an audio consultation. Your doctor will call{" "}
                {patientPhoneDisplay ? <strong>{patientPhoneDisplay}</strong> : "the phone number you provided"} around
                the scheduled time. We&apos;ll remind you shortly before the appointment.
              </span>
            ) : videoRoom ? (
              <a
                href={
                  fromParam
                    ? `${videoRoom}${videoRoom.includes("?") ? "&" : "?"}from=provider`
                    : videoRoom
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Join visit
              </a>
            ) : (
              <span className="text-sm text-slate-500">
                Preparing your video room… you&apos;ll receive the link as soon as payment is confirmed.
              </span>
            )}
            <Link
              href={patientPortalHref}
              className="inline-flex min-w-[140px] items-center justify-center rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Go to patient portal
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800">
            <p className="font-semibold">TELEMEDICINE compliance</p>
            <p className="mt-1">
              This visit summary follows the TELEMEDICINE Practice Guidelines (India, 2020). Emergency care is not
              provided on this platform. If your symptoms worsen, please visit the nearest hospital or call local
              emergency services immediately.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
