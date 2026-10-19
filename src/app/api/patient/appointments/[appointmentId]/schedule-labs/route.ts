import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readPatientPhone } from "@/lib/patientAuth.server";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function buildLast10(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

function formatIST(date: Date): string {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const BodySchema = z.object({
  labOrderId: z.string(),
  collectionType: z.enum(["HOME", "WALK_IN"]),
  scheduledFor: z.string().datetime(),
  scheduleNote: z.string().max(500).optional(),
  address: z
    .object({
      line1: z.string().min(1),
      line2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().min(1),
      postalCode: z.string().regex(/^\d{6}$/),
    })
    .optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const patientPhone = await readPatientPhone();
  if (!patientPhone) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appointmentId } = await params;

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
  }
  const { labOrderId, collectionType, scheduledFor, scheduleNote, address } = parsed.data;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { phone: true, name: true } },
      provider: { select: { name: true, phone: true } },
    },
  });

  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  const patientLast10 = buildLast10(patientPhone);
  const apptLast10 = buildLast10(appointment.patient?.phone ?? "");
  if (!patientLast10 || patientLast10 !== apptLast10) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const labOrder = await prisma.labOrder.findUnique({
    where: { id: labOrderId },
    select: { id: true, status: true, appointmentId: true, labPartnerId: true, labPartner: { select: { phone: true, name: true } } },
  });

  if (!labOrder) return NextResponse.json({ error: "Lab order not found" }, { status: 404 });
  if (labOrder.appointmentId !== appointmentId) {
    return NextResponse.json({ error: "Lab order does not belong to this appointment" }, { status: 403 });
  }
  if (!["PENDING", "CONFIRMED"].includes(labOrder.status)) {
    return NextResponse.json(
      { error: `Cannot schedule collection for order in status ${labOrder.status}` },
      { status: 400 },
    );
  }

  const scheduledDate = new Date(scheduledFor);
  const updateData: Record<string, unknown> = {
    scheduledFor: scheduledDate,
    collectionType,
    scheduleNote: scheduleNote ?? null,
  };
  if (collectionType === "HOME" && address) {
    updateData.address = address;
  }

  await prisma.$transaction([
    prisma.labOrder.update({ where: { id: labOrderId }, data: updateData }),
    prisma.labOrderEvent.create({
      data: {
        labOrderId,
        fromStatus: labOrder.status,
        toStatus: labOrder.status,
        note: `Patient scheduled ${collectionType === "HOME" ? "home collection" : "walk-in visit"} for ${formatIST(scheduledDate)}${scheduleNote ? `. Note: ${scheduleNote}` : ""}`,
        actorEmail: patientPhone,
      },
    }),
  ]);

  // WhatsApp lab partner
  if (labOrder.labPartner?.phone) {
    const patientName = appointment.patient?.name ?? "Patient";
    const msg = `Hi ${labOrder.labPartner.name ?? "team"}, ${patientName} has scheduled a ${
      collectionType === "HOME" ? "home collection" : "walk-in visit"
    } for ${formatIST(scheduledDate)}. View order: caldoc.in/labs/orders/${labOrderId}`;
    sendWhatsAppText(labOrder.labPartner.phone, msg).catch((e) =>
      console.error("lab schedule notify WA", e),
    );
  }

  return NextResponse.json({ ok: true, scheduledFor: scheduledDate.toISOString() });
}
