import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyLabOrderConfirmation } from "@/lib/sendLabOrderConfirmation";

const LAB_ADMIN_PHONE = process.env.LABS_ADMIN_PHONE || "+15135608528";

function formatTests(tests: unknown): string {
  if (!Array.isArray(tests)) return "";
  return tests
    .map((test) => {
      if (typeof test === "string") return test;
      const value = test as Record<string, unknown>;
      const name = String(value?.name || "test");
      const qty = Math.max(1, Number(value?.qty) || 1);
      return qty > 1 ? `${name} × ${qty}` : name;
    })
    .join(", ");
}

function formatAddress(address: unknown): string {
  if (!address) return "";
  const value = address as Record<string, unknown>;
  return [value.line1, value.line2, value.city, value.state, value.postalCode]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId: string = body?.orderId;
    const rzpOrder: string = body?.razorpay_order_id;
    const paymentId: string = body?.razorpay_payment_id;
    const signature: string = body?.razorpay_signature;

    if (!orderId || !rzpOrder || !paymentId || !signature) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }

    const secret = process.env.RZP_SECRET;
    if (!secret) return NextResponse.json({ error: "Missing RZP_SECRET" }, { status: 500 });

    const payload = `${rzpOrder}|${paymentId}`;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { orderId: rzpOrder },
      select: { id: true, status: true, labOrderId: true },
    });
    if (!payment?.labOrderId) {
      return NextResponse.json({ error: "Payment mapping missing" }, { status: 400 });
    }

    // Guard against payload tampering / mismatched order references.
    if (payment.labOrderId !== orderId) {
      return NextResponse.json({ error: "Order mismatch" }, { status: 409 });
    }

    // Idempotency: duplicate callback should return success without replaying side-effects.
    if (payment.status === "CAPTURED") {
      return NextResponse.json({ ok: true, idempotent: true });
    }

    const txResult = await prisma.$transaction([
      prisma.labOrder.updateMany({
        where: { id: payment.labOrderId, status: "AWAITING_PAYMENT" },
        data: { status: "PENDING" },
      }),
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "CAPTURED",
          paymentRef: paymentId,
          currency: "INR",
        },
      }),
      prisma.labOrder.findUniqueOrThrow({ where: { id: payment.labOrderId } }),
    ]);
    const labOrder = txResult[2];

    const testsLabel = formatTests(labOrder.tests);
    const addressLabel = formatAddress(labOrder.address);
    await notifyLabOrderConfirmation({
      orderId: labOrder.id,
      patientName: labOrder.patientName,
      patientPhone: labOrder.patientPhone,
      patientTestsLabel: testsLabel,
      patientAddressLabel: addressLabel,
      adminPhone: LAB_ADMIN_PHONE,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("lab-order confirm error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
