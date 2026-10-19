import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { requireCronAuth } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_BASE_URL ||
  "https://caldoc.in";

function formatISTDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export async function GET(req: NextRequest) {
  const authError = requireCronAuth(req);
  if (authError) return authError;

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Find TIMED follow-ups due in the next 48 hours that haven't been notified yet
  const due = await prisma.followUpRequest.findMany({
    where: {
      type: "TIMED",
      status: "PENDING",
      dueAt: { gte: now, lte: in48h },
    },
    include: {
      patient: { select: { phone: true, name: true } },
      provider: { select: { name: true, slug: true, id: true } },
    },
    take: 200,
  });

  let sent = 0;
  let errors = 0;

  for (const fu of due) {
    const patientPhone = fu.patient?.phone;
    if (!patientPhone) { errors++; continue; }

    const patientName = fu.patient?.name || "there";
    const providerName = fu.provider?.name || "Your doctor";
    const slug = fu.provider?.slug || fu.provider?.id || "";
    const bookingLink = `${BASE_URL}/book/${encodeURIComponent(slug)}?ref=follow-up-reminder&fu=${fu.id}`;
    const dueDateStr = fu.dueAt ? formatISTDate(fu.dueAt) : "soon";

    const isToday =
      fu.dueAt &&
      fu.dueAt.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) ===
        now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const timing = isToday ? "today" : `by ${dueDateStr}`;

    let message =
      `Hi ${patientName}, your follow-up with ${providerName} is due ${timing}.` +
      (fu.providerNote ? `\n\n"${fu.providerNote}"` : "") +
      `\n\nContinue your care: ${bookingLink}`;

    try {
      await sendWhatsAppText(patientPhone, message);
      await prisma.followUpRequest.update({
        where: { id: fu.id },
        data: { status: "NOTIFIED", notifiedAt: now },
      });
      sent++;
    } catch (err) {
      console.error("follow-up reminder WA failed", fu.id, err);
      errors++;
    }
  }

  // Also expire TIMED follow-ups that are past due and still PENDING/NOTIFIED
  const pastDue = await prisma.followUpRequest.updateMany({
    where: {
      type: "TIMED",
      status: { in: ["PENDING", "NOTIFIED"] },
      dueAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    },
    data: { status: "EXPIRED" },
  });

  return NextResponse.json({
    ok: true,
    sent,
    errors,
    expired: pastDue.count,
  });
}
