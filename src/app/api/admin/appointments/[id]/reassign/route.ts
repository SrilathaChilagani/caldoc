import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { providerId, slotId } = body as { providerId?: string; slotId?: string };

  if (!providerId) return NextResponse.json({ error: "providerId required" }, { status: 400 });

  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newProvider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!newProvider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  let newSlot = null;
  if (slotId) {
    newSlot = await prisma.slot.findUnique({ where: { id: slotId } });
    if (!newSlot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    if (newSlot.isBooked) return NextResponse.json({ error: "Slot already booked" }, { status: 409 });
  }

  const prevStatus = appointment.status;

  await prisma.$transaction([
    // Release old slot
    ...(appointment.slotId
      ? [prisma.slot.update({ where: { id: appointment.slotId }, data: { isBooked: false } })]
      : []),
    // Book new slot
    ...(newSlot
      ? [prisma.slot.update({ where: { id: newSlot.id }, data: { isBooked: true } })]
      : []),
    // Reassign appointment
    prisma.appointment.update({
      where: { id },
      data: {
        providerId,
        slotId: slotId ?? null,
        status: "RESCHEDULED",
      },
    }),
    prisma.appointmentStatusHistory.create({
      data: {
        appointmentId: id,
        fromStatus: prevStatus,
        toStatus: "RESCHEDULED",
        actorType: "admin",
        actorId: session.userId,
        reason: `Reassigned to provider ${newProvider.name}${newSlot ? ` — new slot ${new Date(newSlot.startsAt).toISOString()}` : ""}`,
      },
    }),
  ]);

  // Notify patient and new provider via WhatsApp (non-blocking)
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
    const newProviderName = newProvider.name;
    const slotTime = fullAppt.slot?.startsAt
      ? new Date(fullAppt.slot.startsAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "short",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : newSlot?.startsAt
      ? new Date(newSlot.startsAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "short",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "an updated slot";

    const patientMsg = `Hi ${patientName}, your CalDoc appointment has been reassigned to ${newProviderName} (scheduled for ${slotTime}). Please log in to view your updated appointment details.`;
    const providerMsg = `Hi ${newProviderName}, a new CalDoc appointment with patient ${patientName} has been assigned to you (scheduled for ${slotTime}). Please log in to your provider portal for details.`;

    if (fullAppt.patient?.phone) {
      sendWhatsAppText(fullAppt.patient.phone, patientMsg).catch((e) =>
        console.error("[admin/reassign] patient WA failed:", e)
      );
    }
    if (newProvider.phone) {
      sendWhatsAppText(newProvider.phone, providerMsg).catch((e) =>
        console.error("[admin/reassign] provider WA failed:", e)
      );
    }
  }

  return NextResponse.json({ ok: true });
}
