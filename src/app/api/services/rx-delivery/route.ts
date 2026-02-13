import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeRxDeliveryAmount } from "@/lib/rxDeliveryPricing";

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
      },
    });

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("rx-delivery error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
