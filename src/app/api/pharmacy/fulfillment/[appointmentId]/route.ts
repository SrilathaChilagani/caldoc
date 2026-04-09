import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession, requirePharmacySession } from "@/lib/auth.server";
import { getErrorMessage } from "@/lib/errors";
import { sendPharmacyUpdate } from "@/lib/sendPharmacyUpdate";
import { logAudit } from "@/lib/audit";

const StatusSchema = z.object({
  status: z.enum(["READY", "PACKED", "SHIPPED", "DELIVERED", "SENT"]),
  notes: z.string().max(500).optional(),
});

type RouteContext = {
  params: Promise<{ appointmentId: string }>;
};

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = (await requirePharmacySession()) ?? (await requireAdminSession());
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appointmentId } = await ctx.params;
    const payload = await req.json().catch(() => null);
    const parsed = StatusSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        deliveryOpt: true,
        patientName: true,
        patient: { select: { name: true, phone: true } },
        provider: { select: { name: true } },
        prescription: { select: { pdfKey: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (!appointment.prescription?.pdfKey) {
      return NextResponse.json({ error: "Prescription not ready" }, { status: 400 });
    }

    const allowedStatuses =
      appointment.deliveryOpt === "DELIVERY" ? ["READY", "PACKED", "SHIPPED", "DELIVERED"] : ["READY", "SENT"];
    if (!allowedStatuses.includes(parsed.data.status)) {
      return NextResponse.json({ error: "Invalid status for this delivery type" }, { status: 400 });
    }

    const fulfillment = await prisma.pharmacyFulfillment.upsert({
      where: { appointmentId },
      update: { status: parsed.data.status, notes: parsed.data.notes },
      create: {
        appointmentId,
        status: parsed.data.status,
        notes: parsed.data.notes,
      },
      select: { status: true, updatedAt: true },
    });

    await logAudit({
      action: "fulfillment.update",
      actorType: "ADMIN",
      actorId: session.userId,
      meta: { appointmentId, status: parsed.data.status },
    });

    const shouldNotify = appointment.deliveryOpt === "DELIVERY" || parsed.data.status === "SENT";
    if (shouldNotify) {
      await sendPharmacyUpdate({
        appointmentId: appointment.id,
        status: parsed.data.status,
        phone: appointment.patient?.phone,
        patientName: appointment.patientName || appointment.patient?.name,
        providerName: appointment.provider?.name,
      });
    }

    return NextResponse.json({ ok: true, fulfillment });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
