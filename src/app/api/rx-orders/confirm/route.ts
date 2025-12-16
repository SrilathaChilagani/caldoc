import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/whatsapp";

const PHARMACY_PHONE = process.env.PHARMACY_ADMIN_PHONE || "+15135608528";

function formatItems(items: any) {
  if (!Array.isArray(items)) return "";
  return items.map((item) => `${item?.name || "medicine"} × ${item?.qty || 1}`).join(", ");
}

function formatAddress(address: any) {
  if (!address) return "";
  const parts = [address.line1, address.line2, address.city, address.state, address.postalCode]
    .map((p) => (p || "").trim())
    .filter(Boolean);
  return parts.join(", ");
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

    const payment = await prisma.payment.findUnique({ where: { orderId: rzpOrder }, select: { rxOrderId: true } });
    if (!payment?.rxOrderId) {
      return NextResponse.json({ error: "Payment mapping missing" }, { status: 400 });
    }

    const rxOrder = await prisma.rxOrder.update({
      where: { id: payment.rxOrderId },
      data: { status: "PAID" },
    });

    await prisma.payment.update({
      where: { orderId: rzpOrder },
      data: {
        status: "CAPTURED",
        paymentRef: paymentId,
        currency: "INR",
      },
    });

    const itemsLabel = formatItems(rxOrder.items);
    const addressLabel = formatAddress(rxOrder.address);
    const adminMsg = `Ad-hoc Rx order ${rxOrder.id} paid. Patient ${rxOrder.patientName} (${rxOrder.patientPhone}). Items: ${itemsLabel}. Address: ${addressLabel}.`;
    const patientMsg = `Hi ${rxOrder.patientName}, we received your CalDoc Rx delivery order ${rxOrder.id}. Our pharmacy will reach out shortly.`;

    const sends: Promise<unknown>[] = [];
    if (PHARMACY_PHONE) {
      sends.push(sendWhatsAppText(PHARMACY_PHONE, adminMsg).catch((err) => console.error("pharmacy WA", err)));
    }
    if (rxOrder.patientPhone) {
      sends.push(sendWhatsAppText(rxOrder.patientPhone, patientMsg).catch((err) => console.error("patient WA", err)));
    }
    await Promise.all(sends);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("rx-order confirm error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
