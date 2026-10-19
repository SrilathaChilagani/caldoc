import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readPatientPhone } from "@/lib/patientAuth.server";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function buildLast10(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

type Med = { name: string; sig?: string; qty?: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const patientPhone = await readPatientPhone();
  if (!patientPhone) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appointmentId } = await params;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      prescription: true,
      patient: { select: { id: true, name: true, phone: true } },
      provider: { select: { name: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  // Verify patient owns this appointment
  const patientLast10 = buildLast10(patientPhone);
  const appointmentPatientLast10 = buildLast10(appointment.patient?.phone ?? "");
  if (!patientLast10 || patientLast10 !== appointmentPatientLast10) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!appointment.prescription) {
    return NextResponse.json(
      { error: "No prescription found for this appointment" },
      { status: 400 },
    );
  }

  // Check for existing non-cancelled/non-rejected RxOrder for this appointmentId
  const existing = await prisma.rxOrder.findFirst({
    where: {
      appointmentId,
      status: { notIn: ["CANCELLED", "REJECTED"] },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ orderId: existing.id });
  }

  // Parse prescription meds
  const medsRaw = appointment.prescription.meds;
  const meds: Med[] = Array.isArray(medsRaw)
    ? (medsRaw as Array<Record<string, unknown>>).map((m) => ({
        name: String(m.name || "").trim(),
        sig: m.sig ? String(m.sig).trim() : undefined,
        qty: m.qty ? String(m.qty).trim() : undefined,
      })).filter((m) => m.name)
    : [];

  if (!meds.length) {
    return NextResponse.json({ error: "Prescription has no medicines" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  // Validate address
  const addr = (body.address || {}) as Record<string, unknown>;
  const line1 = String(addr.line1 || "").trim();
  const line2 = String(addr.line2 || "").trim();
  const city = String(addr.city || "").trim();
  const state = String(addr.state || "").trim();
  const postalCode = String(addr.postalCode || "").trim();

  if (!line1 || !city || !state || !postalCode) {
    return NextResponse.json(
      { error: "Address must include line1, city, state, and postalCode" },
      { status: 400 },
    );
  }

  const patientEmail = body.patientEmail ? String(body.patientEmail).trim() : null;

  // Find pharmacy partner by postal code
  const partner = await prisma.pharmacyPartner.findFirst({
    where: {
      isActive: true,
      serviceAreas: { hasSome: [postalCode] },
    },
    select: { id: true, phone: true, name: true },
  });

  const patient = appointment.patient!;
  const patientName = patient.name;
  const patientPhoneStored = patient.phone;

  const address = { line1, ...(line2 ? { line2 } : {}), city, state, postalCode };
  const quoteExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

  // Build items JSON snapshot
  const itemsSnapshot = meds.map((m) => ({ name: m.name, qty: m.qty || "1" }));

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.rxOrder.create({
      data: {
        patientId: patient.id,
        patientName,
        patientPhone: patientPhoneStored,
        patientEmail,
        address,
        items: itemsSnapshot,
        amountPaise: 0,
        quoteExpiresAt,
        status: "QUOTE_PENDING",
        pharmacyPartnerId: partner?.id ?? null,
        appointmentId,
      },
    });

    // Create per-item records
    await tx.rxOrderItem.createMany({
      data: meds.map((m) => ({
        rxOrderId: created.id,
        name: m.name,
        sig: m.sig ?? null,
        qtyPrescribed: m.qty ?? null,
        status: "PENDING",
      })),
    });

    // Create initial event
    await tx.rxOrderEvent.create({
      data: {
        rxOrderId: created.id,
        toStatus: "QUOTE_PENDING",
        note: "Order created from prescription",
        actorEmail: patientPhoneStored,
      },
    });

    return created;
  });

  // Notify pharmacy partner via WhatsApp
  if (partner?.phone) {
    sendWhatsAppText(
      partner.phone,
      `New prescription order from ${patientName} is awaiting your quote. Review at caldoc.in/pharmacy/rx-orders/${order.id}`,
    ).catch((e) => console.error("pharmacy quote notify WA", e));
  }

  return NextResponse.json({
    orderId: order.id,
    reviewUrl: `/patient/rx-orders/${order.id}/review`,
  });
}
