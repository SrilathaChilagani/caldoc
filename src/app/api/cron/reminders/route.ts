import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { getErrorMessage } from "@/lib/errors";
import { sendCheckinFormLink } from "@/lib/sendCheckinFormLink";

const WINDOW_MINUTES = Number(process.env.APPOINTMENT_REMINDER_WINDOW_MIN || 30);
const REMINDER_LANG = process.env.WHATSAPP_LANG || "en_US";
const REMINDER_24_TEMPLATE =
  process.env.WHATSAPP_TMPL_PATIENT_VIDEO_24 ||
  process.env.WHATSAPP_TMPL_APPT_REMINDER_24H ||
  process.env.WHATSAPP_APPOINTMENT_REMINDER_24H ||
  "appointment_reminder_24hr";
const JOBS = [
  {
    kind: "APPT_REMINDER_24H",
    template: REMINDER_24_TEMPLATE,
    offsetMinutes: 24 * 60,
    buildVars: (opts: ReminderTemplateOptions) => [
      opts.patientFirstName,
      opts.joinLink,
      opts.visitTimeLabel,
      opts.rescheduleLink,
      opts.providerName,
    ],
  },
] as const;

type ReminderTemplateOptions = {
  patientFirstName: string;
  providerName: string;
  joinLink: string;
  rescheduleLink: string;
  visitTimeLabel: string;
};

function appBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://caldoc.in"
  );
}

function formatIST(date: Date) {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function windowRange(offsetMinutes: number) {
  const now = Date.now();
  const start = new Date(now + offsetMinutes * 60 * 1000);
  const end = new Date(start.getTime() + WINDOW_MINUTES * 60 * 1000);
  return { start, end };
}

async function fetchAppointmentsForReminder(offsetMinutes: number, kind: string) {
  const { start, end } = windowRange(offsetMinutes);
  return prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      slot: { startsAt: { gte: start, lt: end } },
      messages: { none: { kind } },
    },
    select: {
      id: true,
      visitMode: true,
      patientName: true,
      patient: { select: { name: true, phone: true } },
      provider: { select: { name: true } },
      slot: { select: { startsAt: true } },
      checkInForm: { select: { completedAt: true } },
    },
    take: 100,
  });
}

async function logOutboundMessage(opts: {
  appointmentId: string;
  toPhone: string;
  template: string;
  body: string;
  status: "SENT" | "FAILED";
  kind: string;
  messageId?: string | null;
  error?: string;
}) {
  await prisma.outboundMessage.create({
    data: {
      appointmentId: opts.appointmentId,
      channel: "WHATSAPP",
      toPhone: opts.toPhone,
      template: opts.template,
      body: opts.body,
      messageId: opts.messageId ?? undefined,
      status: opts.status,
      error: opts.error,
      kind: opts.kind,
    },
  });
}

export async function GET(req: NextRequest) {
  // Require CRON_SECRET so only Vercel Cron (or authorised callers) can trigger reminders.
  // Vercel automatically injects `Authorization: Bearer <CRON_SECRET>` on cron invocations.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results = [];

  for (const job of JOBS) {
    const appointments = await fetchAppointmentsForReminder(
      job.offsetMinutes,
      job.kind
    );

    const jobStats = { kind: job.kind, attempted: appointments.length, sent: 0, failed: 0 };

    for (const appt of appointments) {
      if (appt.visitMode === "AUDIO") {
        continue;
      }
      const patientPhone = appt.patient?.phone;
      const slotStartsAt = appt.slot?.startsAt;
      if (!patientPhone || !slotStartsAt) {
        continue;
      }

      const patientFirstName = (appt.patientName || appt.patient?.name || "there").split(" ")[0];
      const providerName = appt.provider?.name || "your doctor";
      const baseUrl = appBaseUrl();
      const joinLink = `${baseUrl}/visit/${appt.id}`;
      const rescheduleLink = `${baseUrl}/patient/appointments/${appt.id}`;
      const templateVars = job.buildVars({
        patientFirstName,
        providerName,
        joinLink,
        rescheduleLink,
        visitTimeLabel: formatIST(slotStartsAt),
      });

      try {
        const result = await sendWhatsAppTemplate({
          to: patientPhone,
          template: job.template,
          lang: REMINDER_LANG,
          vars: templateVars,
        });
        await logOutboundMessage({
          appointmentId: appt.id,
          toPhone: patientPhone,
          template: job.template,
          body: `${job.kind} → ${formatIST(slotStartsAt)}`,
          status: "SENT",
          messageId: result?.messageId ?? null,
          kind: job.kind,
        });
        jobStats.sent += 1;
      } catch (err) {
        jobStats.failed += 1;
        await logOutboundMessage({
          appointmentId: appt.id,
          toPhone: patientPhone,
          template: job.template,
          body: `${job.kind} → ${formatIST(slotStartsAt)}`,
          status: "FAILED",
          kind: job.kind,
          messageId: null,
          error: getErrorMessage(err),
        });
      }

      // If the patient hasn't filled the check-in form yet, send them the link
      // alongside the reminder. Skip if already completed.
      if (!appt.checkInForm?.completedAt) {
        const checkinKind = "PATIENT_CHECKIN_REMINDER_24H";
        // Only send once per job kind (reuse OutboundMessage dedup via kind)
        const alreadySentCheckin = await prisma.outboundMessage.count({
          where: { appointmentId: appt.id, kind: checkinKind },
        });
        if (alreadySentCheckin === 0) {
          sendCheckinFormLink({
            appointmentId: appt.id,
            patientPhone,
            patientName: appt.patientName || appt.patient?.name || "Patient",
            slotStartsAt,
            kind: checkinKind,
          }).catch((err) =>
            console.error(`[reminders] checkin link (${checkinKind}) failed:`, getErrorMessage(err))
          );
        }
      }
    }

    results.push(jobStats);
  }

  return NextResponse.json({ ok: true, results });
}
