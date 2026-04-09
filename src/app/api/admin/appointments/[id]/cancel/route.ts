import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  if (appointment.status === "CANCELLED" || appointment.status === "CANCELED") {
    return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
  }

  const prevStatus = appointment.status;

  await prisma.$transaction([
    prisma.appointment.update({ where: { id }, data: { status: "CANCELLED" } }),
    prisma.appointmentStatusHistory.create({
      data: {
        appointmentId: id,
        fromStatus: prevStatus,
        toStatus: "CANCELLED",
        actorType: "admin",
        actorId: session.userId,
        reason: "Cancelled by admin",
      },
    }),
    ...(appointment.slotId
      ? [prisma.slot.update({ where: { id: appointment.slotId }, data: { isBooked: false } })]
      : []),
  ]);

  // Notify patient and provider via WhatsApp (non-blocking)
  const fullAppt = await prisma.appointment.findUnique({
    where: { id },
    select: {
      patientName: true,
      patient: { select: { name: true, phone: true } },
      provider: { select: { name: true, phone: true } },
      slot: { select: { startsAt: true } },
    },
  });

  if (fullAppt) {
    const patientName = fullAppt.patientName || fullAppt.patient?.name || "Patient";
    const providerName = fullAppt.provider?.name || "the provider";
    const slotTime = fullAppt.slot?.startsAt
      ? new Date(fullAppt.slot.startsAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "short",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "your upcoming slot";

    const patientMsg = `Hi ${patientName}, your CalDoc appointment with ${providerName} (scheduled for ${slotTime}) has been cancelled by our team. If you have any questions, please contact support.`;
    const providerMsg = `Hi ${providerName}, the CalDoc appointment with patient ${patientName} (scheduled for ${slotTime}) has been cancelled by admin.`;

    if (fullAppt.patient?.phone) {
      sendWhatsAppText(fullAppt.patient.phone, patientMsg).catch((e) =>
        console.error("[admin/cancel] patient WA failed:", e)
      );
    }
    if (fullAppt.provider?.phone) {
      sendWhatsAppText(fullAppt.provider.phone, providerMsg).catch((e) =>
        console.error("[admin/cancel] provider WA failed:", e)
      );
    }
  }

  return NextResponse.json({ ok: true });
}
