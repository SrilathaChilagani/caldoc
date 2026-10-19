import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireProviderSession } from "@/lib/auth.server";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_BASE_URL ||
  "https://caldoc.in";

const BodySchema = z.object({
  type: z.enum(["TIMED", "AFTER_LAB_RESULTS"]),
  daysUntilDue: z.number().int().min(1).max(365).optional(),
  labOrderId: z.string().optional(),
  providerNote: z.string().max(300).optional(),
});

type RouteContext = { params: Promise<{ appointmentId: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const session = await requireProviderSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appointmentId } = await ctx.params;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { id: true, phone: true, name: true } },
      provider: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!appointment || appointment.providerId !== session.providerId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!appointment.patient) {
    return NextResponse.json({ error: "Patient not found on appointment" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  const { type, daysUntilDue, labOrderId, providerNote } = parsed.data;

  if (type === "TIMED" && (!daysUntilDue || daysUntilDue < 1)) {
    return NextResponse.json({ error: "daysUntilDue required for TIMED follow-up" }, { status: 400 });
  }

  if (labOrderId) {
    const labOrder = await prisma.labOrder.findUnique({
      where: { id: labOrderId },
      select: { appointmentId: true },
    });
    if (!labOrder || labOrder.appointmentId !== appointmentId) {
      return NextResponse.json({ error: "Lab order not found for this appointment" }, { status: 400 });
    }
  }

  // Expire any existing PENDING follow-up for this appointment
  await prisma.followUpRequest.updateMany({
    where: { appointmentId, status: "PENDING" },
    data: { status: "EXPIRED" },
  });

  const dueAt =
    type === "TIMED" && daysUntilDue
      ? new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000)
      : null;

  const followUp = await prisma.followUpRequest.create({
    data: {
      appointmentId,
      patientId: appointment.patient.id,
      providerId: appointment.providerId,
      labOrderId: labOrderId ?? null,
      type,
      daysUntilDue: daysUntilDue ?? null,
      status: "PENDING",
      dueAt,
      providerNote: providerNote ?? null,
    },
  });

  // Send immediate WhatsApp
  const patientPhone = appointment.patient.phone;
  const patientName = appointment.patientName || appointment.patient.name || "there";
  const providerName = appointment.provider?.name || "Your doctor";
  const slug = appointment.provider?.slug || appointment.providerId;
  const bookingLink = `${BASE_URL}/book/${encodeURIComponent(slug)}?ref=follow-up&fu=${followUp.id}`;

  let waMessage: string;
  if (type === "TIMED") {
    const days = daysUntilDue!;
    waMessage =
      `Hi ${patientName}, ${providerName} has recommended a follow-up consultation in ${days} day${days === 1 ? "" : "s"}.` +
      (providerNote ? `\n\n"${providerNote}"` : "") +
      `\n\nContinue your care with ${providerName}: ${bookingLink}`;
  } else {
    waMessage =
      `Hi ${patientName}, ${providerName} has requested a follow-up once your lab results are ready.` +
      (providerNote ? `\n\n"${providerNote}"` : "") +
      `\n\nYou will receive a reminder when your results are available. Book early if you prefer: ${bookingLink}`;
  }

  sendWhatsAppText(patientPhone, waMessage).catch((e) =>
    console.error("follow-up WA notify", e),
  );

  return NextResponse.json({ ok: true, followUpId: followUp.id });
}

// Returns the active follow-up request so the provider UI can show its status
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const session = await requireProviderSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appointmentId } = await ctx.params;

  const followUp = await prisma.followUpRequest.findFirst({
    where: { appointmentId, status: { in: ["PENDING", "NOTIFIED"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, type: true, daysUntilDue: true, status: true,
      dueAt: true, providerNote: true, notifiedAt: true, createdAt: true,
    },
  });

  return NextResponse.json({ followUp: followUp ?? null });
}
