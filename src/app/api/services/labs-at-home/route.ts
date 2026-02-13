import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeLabAmount } from "@/lib/labPricing";

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
    const tests = Array.isArray(body?.tests) ? body.tests : [];
    const items = tests
      .map((item: unknown) => {
        if (typeof item === "string") {
          return { name: item.trim(), qty: 1 };
        }
        const value = item as Record<string, unknown>;
        return {
          name: String(value?.name || "").trim(),
          qty: Math.max(1, Number(value?.qty) || 1),
        };
      })
      .filter((item: { name: string }) => Boolean(item.name));

    if (!items.length) {
      return NextResponse.json({ error: "Please select at least one lab test" }, { status: 400 });
    }

    const patientName = String(body?.patientName || "").trim();
    const patientPhone = String(body?.patientPhone || "").trim();
    const patientEmail = body?.patientEmail ? String(body.patientEmail).trim() : null;
    const address = {
      line1: String(body?.address?.line1 || "").trim(),
      line2: String(body?.address?.line2 || "").trim(),
      city: String(body?.address?.city || "").trim(),
      state: String(body?.address?.state || "").trim(),
      postalCode: String(body?.address?.postalCode || "").trim(),
    };

    if (!patientName || !patientPhone || !address.line1 || !address.city || !address.state || !address.postalCode) {
      return NextResponse.json({ error: "Please fill patient contact and address" }, { status: 400 });
    }

    const amountPaise = computeLabAmount(items);
    if (!amountPaise) {
      return NextResponse.json({ error: "Unable to compute price" }, { status: 400 });
    }

    const { last10, candidates } = buildPhoneCandidates(patientPhone);
    const patientMatch = await prisma.patient.findFirst({
      where: {
        OR: [{ phone: { contains: last10 } }, { phone: { in: candidates } }],
      },
      select: { id: true },
    });

    const order = await prisma.labOrder.create({
      data: {
        patientId: patientMatch?.id || null,
        patientName,
        patientPhone,
        patientEmail,
        deliveryMode: "IN_HOUSE",
        tests: items,
        notes: body?.instructions ? String(body.instructions) : null,
        status: "AWAITING_PAYMENT",
        address,
        amountPaise,
        source: "ADHOC",
      },
    });

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("labs-at-home error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
