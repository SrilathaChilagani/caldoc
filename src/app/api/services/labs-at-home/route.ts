import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const UNIT_PRICE = Number(process.env.LABS_HOME_TEST_PAISE || 79900);

function computeAmount(tests: string[]) {
  if (!tests.length) return 0;
  return tests.length * UNIT_PRICE;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tests = Array.isArray(body?.tests)
      ? body.tests
          .map((item: unknown) => String(item || "").trim())
          .filter((item: string) => Boolean(item))
      : [];

    if (!tests.length) {
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

    const amountPaise = computeAmount(tests);
    if (!amountPaise) {
      return NextResponse.json({ error: "Unable to compute price" }, { status: 400 });
    }

    const order = await prisma.labOrder.create({
      data: {
        patientName,
        patientPhone,
        patientEmail,
        deliveryMode: "IN_HOUSE",
        tests,
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
