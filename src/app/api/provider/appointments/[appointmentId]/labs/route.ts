import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProviderSession, requireAdminSession } from "@/lib/auth.server";
import { sendWhatsAppText } from "@/lib/whatsapp";

const LABS_ADMIN_PHONE = process.env.LABS_ADMIN_PHONE || "+15135608528";

function normalizeTests(bodyTests: unknown, custom: unknown) {
  const base = Array.isArray(bodyTests) ? bodyTests : [];
  const extra = typeof custom === "string" ? custom.split(",") : [];
  const candidates = [...base, ...extra];
  const cleaned = candidates
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

type RouteContext = {
  params: Promise<{ appointmentId: string }>;
};

export async function POST(req: NextRequest, ctx: RouteContext) {
  const providerSess = await requireProviderSession();
  const adminSess = await requireAdminSession();
  if (!providerSess && !adminSess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appointmentId } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const deliveryMode = body.deliveryMode === "EXTERNAL" ? "EXTERNAL" : "IN_HOUSE";
  const tests = normalizeTests(body.tests, body.customTests);
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (tests.length === 0) {
    return NextResponse.json({ error: "Select at least one lab test" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      provider: true,
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  if (providerSess && appointment.providerId !== providerSess.providerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const order = await prisma.labOrder.create({
    data: {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      patientName: appointment.patientName || appointment.patient?.name,
      patientPhone: appointment.patient?.phone,
      deliveryMode,
      tests,
      notes,
      status: "PENDING",
    },
  });

  const providerName = appointment.provider?.name || "Your doctor";
  const patientName = appointment.patientName || appointment.patient?.name || "patient";
  const testsLabel = tests.join(", ");

  const labMessage = `New lab order from ${providerName} (${appointment.provider?.speciality || ""}). Tests: ${testsLabel}. Patient: ${patientName}. Mode: ${deliveryMode === "IN_HOUSE" ? "CalDoc labs" : "External"}.`;
  const patientMessage = `Hi ${patientName}, ${providerName} ordered lab tests (${testsLabel}). Our labs team will reach out soon.`;

  const sends: Promise<unknown>[] = [];
  if (LABS_ADMIN_PHONE) {
    sends.push(
      sendWhatsAppText(LABS_ADMIN_PHONE, labMessage).catch((err) => {
        console.error("labs admin WA send failed", err);
      }),
    );
  }
  if (appointment.patient?.phone) {
    sends.push(
      sendWhatsAppText(appointment.patient.phone, patientMessage).catch((err) => {
        console.error("patient WA send failed", err);
      }),
    );
  }
  await Promise.all(sends);

  return NextResponse.json({ ok: true, orderId: order.id });
}
