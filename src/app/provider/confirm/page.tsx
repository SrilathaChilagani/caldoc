import Link from "next/link";
import { prisma } from "@/lib/db";
import { verifyProviderConfirmToken } from "@/lib/providerConfirmToken";
import { sendPatientUploadLink } from "@/lib/sendPatientUploadLink";
import {
  ensureVideoRoomIfNeeded,
  notifyVideoLinks,
  sendPatientVideoConfirmation,
} from "@/lib/videoLinkHelpers";

type PageProps = {
  searchParams?: { token?: string | string[] };
};

function appBaseUrl() {
  return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";
}

export default async function ProviderConfirmPage({ searchParams }: PageProps) {
  const tokenParam = searchParams?.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
  const parsed = verifyProviderConfirmToken(token);

  if (!parsed) {
    return (
      <main className="mx-auto max-w-lg space-y-3 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-rose-600">Link expired</h1>
        <p className="text-sm text-slate-600">We could not validate this confirmation link. Please log in to the provider portal to confirm the appointment.</p>
        <Link href="/provider/login" className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Open provider portal
        </Link>
      </main>
    );
  }

  const baseUrl = appBaseUrl();
  const appointment = await prisma.appointment.findUnique({
    where: { id: parsed.appointmentId },
    include: {
      patient: true,
      provider: true,
      slot: { select: { startsAt: true } },
    },
  });

  if (!appointment || appointment.providerId !== parsed.providerId) {
    return (
      <main className="mx-auto max-w-lg space-y-3 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-rose-600">Appointment not found</h1>
        <p className="text-sm text-slate-600">This link does not match an active appointment. Please sign in to the provider portal.</p>
        <Link href="/provider/login" className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Provider portal
        </Link>
      </main>
    );
  }

  let current = appointment;
  if (appointment.status !== "CONFIRMED") {
    current = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CONFIRMED",
        statusHistory: {
          create: {
            fromStatus: appointment.status,
            toStatus: "CONFIRMED",
            actorType: "PROVIDER_LINK",
            actorId: parsed.providerId,
          },
        },
      },
      include: {
        patient: true,
        provider: true,
        slot: { select: { startsAt: true } },
      },
    });
    await sendPatientUploadLink(current, baseUrl);
  }

  const videoLink = await ensureVideoRoomIfNeeded(
    current.id,
    {
      visitMode: current.visitMode,
      videoRoom: current.videoRoom,
      slotStartsAt: current.slot?.startsAt ?? null,
      forceImmediate: true,
    },
    baseUrl,
  );
  await sendPatientVideoConfirmation(current, videoLink || current.videoRoom);
  await notifyVideoLinks(current, videoLink || current.videoRoom, { notifyPatient: false });

  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-emerald-600">Appointment confirmed</h1>
        <p className="text-sm text-slate-600">
          We&apos;ve confirmed the visit for {current.patientName || current.patient?.name || "the patient"}. Patients will see the update instantly.
        </p>
      </div>
      <div className="rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-sm">
        <p className="text-xs uppercase text-slate-500">Visit details</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">
          {current.patientName || current.patient?.name || "Patient"}
        </p>
        <p className="text-sm text-slate-600">{current.slot?.startsAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
        <p className="mt-3 text-sm text-slate-600">
          Want to make changes? Head back to the provider portal to reschedule or cancel.
        </p>
        <Link href="/provider/login" className="mt-3 inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Open provider portal
        </Link>
      </div>
    </main>
  );
}
