import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeRxDeliveryAmount } from "@/lib/rxDeliveryPricing";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const RX_IP_LIMIT    = { maxRequests: 3, windowMs: 60 * 60_000 };       // 3/hr per IP
const RX_PHONE_LIMIT = { maxRequests: 2, windowMs: 24 * 60 * 60_000 };  // 2/day per phone

type ItemPayload = { name: string; qty: number };

function buildPhoneCandidates(raw: string | undefined | null) {
  const trimmed = (raw || "").trim();
  const digits = trimmed.replace(/\D/g, "");
  const last10 = digits.slice(-10);

  const set = new Set<string>();
  if (trimmed) set.add(trimmed);
  if (digits) set.add(digits);
  if (last10) {
    set.add(last10);
    set.add("+91" + last10);
    set.add("91" + last10);
    set.add("0" + last10);
  }

  return { last10, candidates: Array.from(set) };
}

export async function POST(req: NextRequest) {
  // Layer 1: IP limit
  const ipRl = checkRateLimit(getClientIp(req.headers), RX_IP_LIMIT);
  if (!ipRl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(ipRl.retryAfterSec) } },
    );
  }

  try {
    const body = await req.json();
    const items: ItemPayload[] = Array.isArray(body?.items)
      ? body.items
          .map((item: unknown) => {
            const value = item as Record<string, unknown>;
            return { name: String(value?.name || "").trim(), qty: Number(value?.qty) || 0 };
          })
          .filter((item: ItemPayload) => item.name && item.qty > 0)
      : [];

    if (!items.length) {
      return NextResponse.json({ error: "Add at least one medicine" }, { status: 400 });
    }

    const amountPaise = computeRxDeliveryAmount(items);
    if (!amountPaise || Number.isNaN(amountPaise)) {
      return NextResponse.json({ error: "Unable to compute price" }, { status: 400 });
    }

    const patientName = String(body?.patientName || "").trim();
    const patientPhone = String(body?.patientPhone || "").trim();
    const address = {
      line1: String(body?.address?.line1 || "").trim(),
      line2: String(body?.address?.line2 || "").trim(),
      city: String(body?.address?.city || "").trim(),
      state: String(body?.address?.state || "").trim(),
      postalCode: String(body?.address?.postalCode || "").trim(),
    };

    if (!patientName || !patientPhone || !address.line1 || !address.city || !address.state || !address.postalCode) {
      return NextResponse.json({ error: "Fill all contact and address fields" }, { status: 400 });
    }

    // Layer 2: per-phone daily limit — prevents targeting a specific number
    const phoneMeta = buildPatientPhoneMeta(patientPhone);
    if (phoneMeta) {
      const phoneRl = checkRateLimit(`rx:${phoneMeta.canonical}`, RX_PHONE_LIMIT);
      if (!phoneRl.allowed) {
        return NextResponse.json(
          { error: "Too many orders for this number. Please try again tomorrow." },
          { status: 429, headers: { "Retry-After": String(phoneRl.retryAfterSec) } },
        );
      }
    }

    const prescription = body?.prescription as
      | { key?: string; fileName?: string; contentType?: string; size?: number }
      | undefined;

    const matchedMeds = await prisma.medication.findMany({
      where: {
        OR: items.map((item) => ({
          name: { equals: item.name, mode: "insensitive" },
        })),
      },
      select: { name: true, category: true },
    });
    const requiresPrescription = matchedMeds.some(
      (med) => med.category && med.category !== "OTC",
    );

    if (requiresPrescription && !prescription?.key) {
      return NextResponse.json(
        { error: "Prescription upload required for Rx-only medicines" },
        { status: 400 },
      );
    }

    const { last10, candidates } = buildPhoneCandidates(patientPhone);
    const patientMatch = await prisma.patient.findFirst({
      where: {
        OR: [{ phone: { contains: last10 } }, { phone: { in: candidates } }],
      },
      select: { id: true },
    });

    // Find a matching pharmacy partner by delivery postal code
    const assignedPartner = await prisma.pharmacyPartner.findFirst({
      where: {
        isActive: true,
        serviceAreas: { hasSome: [address.postalCode] },
      },
      select: { id: true },
    });

    // Optional: link this Rx order back to the appointment that issued the prescription
    const appointmentId = body?.appointmentId ? String(body.appointmentId).trim() : null;
    const linkedAppt = appointmentId
      ? await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true } })
      : null;

    const order = await prisma.rxOrder.create({
      data: {
        patientId: patientMatch?.id || null,
        patientName,
        patientPhone,
        patientEmail: body?.patientEmail ? String(body.patientEmail) : null,
        address,
        notes: body?.instructions ? String(body.instructions) : null,
        items,
        rxDocumentKey: prescription?.key || null,
        rxDocumentName: prescription?.fileName || null,
        rxDocumentType: prescription?.contentType || null,
        rxDocumentSize:
          typeof prescription?.size === "number" ? Math.max(0, prescription.size) : null,
        rxDocumentUploadedAt: prescription?.key ? new Date() : null,
        amountPaise,
        status: "AWAITING_PAYMENT",
        pharmacyPartnerId: assignedPartner?.id ?? null,
        appointmentId: linkedAppt?.id ?? null,
      },
    });

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    console.error("rx-delivery error", err);
    return NextResponse.json({ error: "Unable to create order. Please try again." }, { status: 500 });
  }
}
