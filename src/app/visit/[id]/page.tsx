// src/app/visit/[id]/page.tsx
import { prisma } from "@/lib/db";
import { ensureVideoRoomIfNeeded } from "@/lib/videoLinkHelpers";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
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
      <main className="flex min-h-[calc(100vh-140px)] items-center justify-center bg-[#f7f2ea] px-4">
        <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)] backdrop-blur-sm">
          <h1 className="font-serif text-xl font-semibold text-slate-900">Appointment not found</h1>
          <Link className="mt-3 inline-flex text-sm font-semibold text-[#2f6ea5] hover:text-[#255b8b]" href={backHref}>
            ← Go home
          </Link>
        </div>
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
      ? `/patient/login?next=${encodeURIComponent("/patient/appointments")}&phone=${encodeURIComponent(appt.patient.phone)}`
      : "/patient/login";
  const isAudioVisit = appt.visitMode === "AUDIO";
  const patientPhoneDisplay = appt.patient?.phone ? appt.patient.phone.replace(/\s+/g, "") : null;

  return (
    <main className="min-h-[calc(100vh-140px)] bg-[#f7f2ea] py-12">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 sm:px-6 lg:px-10">

        {/* Main card */}
        <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)] backdrop-blur-sm md:p-8">
          <Link
            href={backHref}
            className="inline-flex items-center text-sm font-semibold text-[#2f6ea5] hover:text-[#255b8b]"
          >
            ← Back home
          </Link>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-serif text-3xl font-semibold text-slate-900">Your visit details</h1>
              <p className="mt-1 text-sm text-slate-500">
                Appointment ID:{" "}
                <span className="font-mono text-slate-700">{appt.id}</span>
              </p>
            </div>
            <span
              className={`self-start rounded-full px-3 py-1 text-xs font-semibold uppercase ${
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

          {/* Provider + When cards */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/60 bg-white/60 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Provider</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{appt.provider?.name ?? "—"}</p>
              <p className="text-sm text-slate-500">
                Patient: {appt.patientName || appt.patient?.name || "—"}
              </p>
              <dl className="mt-3 space-y-1.5 text-xs">
                <div>
                  <dt className="font-semibold text-slate-600">Qualification</dt>
                  <dd className="text-slate-500">{rmpInfo.qualification}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-600">RMP registration</dt>
                  <dd className="text-slate-500">{rmpInfo.registrationNumber}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-600">Council</dt>
                  <dd className="text-slate-500">{rmpInfo.councilName}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/60 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">When</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{whenIST} IST</p>
              <p className="mt-1 text-sm text-slate-500">
                Delivery option:{" "}
                {appt.deliveryOpt ? appt.deliveryOpt : "Prescription will be sent to your phone"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {isAudioVisit ? (
              <p className="text-sm text-slate-600">
                This is an audio consultation. Your doctor will call{" "}
                {patientPhoneDisplay ? <strong>{patientPhoneDisplay}</strong> : "the phone number you provided"}{" "}
                around the scheduled time. We&apos;ll remind you shortly before the appointment.
              </p>
            ) : videoRoom ? (
              <a
                href={fromParam ? `${videoRoom}${videoRoom.includes("?") ? "&" : "?"}from=provider` : videoRoom}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full bg-[#2f6ea5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#255b8b]"
              >
                Join visit
              </a>
            ) : (
              <p className="text-sm text-slate-500">
                Preparing your video room… you&apos;ll receive the link as soon as payment is confirmed.
              </p>
            )}
            <Link
              href={patientPortalHref}
              className="inline-flex min-w-[160px] items-center justify-center rounded-full border border-[#2f6ea5] px-6 py-2.5 text-sm font-semibold text-[#2f6ea5] hover:bg-[#2f6ea5] hover:text-white transition-colors"
            >
              Go to patient portal
            </Link>
          </div>

          {/* Telemedicine compliance notice */}
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-800">
            <p className="font-semibold uppercase tracking-wide">Telemedicine compliance</p>
            <p className="mt-1 leading-relaxed">
              This visit summary follows the Telemedicine Practice Guidelines (India, 2020). Emergency care is not
              provided on this platform. If your symptoms worsen, please visit the nearest hospital or call local
              emergency services immediately.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
