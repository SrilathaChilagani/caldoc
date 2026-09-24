import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { pharmEasyAdapter } from "@/lib/pharmacy/adapters/pharmeasy";
import { oneMgAdapter } from "@/lib/pharmacy/adapters/onemg";
import type { PharmacyAdapter } from "@/lib/pharmacy/types";

export const dynamic = "force-dynamic";

function getAdapter(apiType: string | null | undefined): PharmacyAdapter | null {
  switch (apiType) {
    case "PHARMEASY": return pharmEasyAdapter;
    case "1MG":       return oneMgAdapter;
    default:          return null;
  }
}

function verifySignature(secret: string, rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  // Accept "sha256=<hex>" or plain hex
  const incoming = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(incoming, "hex"));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> },
) {
  const { partnerId } = await params;

  const partner = await prisma.pharmacyPartner.findUnique({
    where: { id: partnerId },
    select: { id: true, apiType: true, webhookSecret: true },
  });

  if (!partner) return NextResponse.json({ error: "Unknown partner" }, { status: 404 });

  const rawBody = await req.text();

  // Verify HMAC signature if a webhook secret is configured
  if (partner.webhookSecret) {
    const sig = req.headers.get("x-pharmacy-signature") ?? req.headers.get("x-hub-signature-256");
    if (!verifySignature(partner.webhookSecret, rawBody, sig)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const externalOrderId = String(payload.order_id ?? payload.orderId ?? "");
  const externalStatus  = String(payload.status ?? payload.order_status ?? "");

  if (!externalOrderId || !externalStatus) {
    return NextResponse.json({ error: "Missing order_id or status" }, { status: 400 });
  }

  // Find the CalDoc order by external ID
  const rxOrder = await prisma.rxOrder.findFirst({
    where: { externalOrderId, pharmacyPartnerId: partnerId },
    select: { id: true, status: true, patientPhone: true, patientName: true },
  });

  if (!rxOrder) {
    // Unknown order — log and ack so the partner doesn't retry indefinitely
    console.warn(`pharmacy webhook: unknown externalOrderId ${externalOrderId} for partner ${partnerId}`);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const adapter = getAdapter(partner.apiType);
  const newStatus = adapter?.mapStatus(externalStatus) ?? null;

  if (!newStatus || newStatus === rxOrder.status) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const trackingNumber = String(payload.tracking_number ?? payload.awb ?? "").trim() || undefined;
  const courierName    = String(payload.courier ?? payload.courier_name ?? "").trim() || undefined;

  await prisma.$transaction([
    prisma.rxOrder.update({
      where: { id: rxOrder.id },
      data: {
        status: newStatus,
        ...(trackingNumber ? { trackingNumber } : {}),
        ...(courierName    ? { courierName }    : {}),
      },
    }),
    prisma.rxOrderEvent.create({
      data: {
        rxOrderId:  rxOrder.id,
        fromStatus: rxOrder.status,
        toStatus:   newStatus,
        note:       `Partner webhook: ${externalStatus}`,
        trackingNumber,
        courierName,
        actorEmail: `webhook@partner:${partnerId}`,
      },
    }),
  ]);

  // Notify patient on dispatch and delivery
  if (rxOrder.patientPhone && (newStatus === "DISPATCHED" || newStatus === "DELIVERED")) {
    const trackInfo =
      newStatus === "DISPATCHED" && trackingNumber
        ? `\nTracking: ${courierName ? courierName + " — " : ""}${trackingNumber}`
        : "";
    const msg =
      newStatus === "DISPATCHED"
        ? `Hi ${rxOrder.patientName}, your CalDoc medicine order is on its way!${trackInfo}`
        : `Hi ${rxOrder.patientName}, your CalDoc medicine order has been delivered. Get well soon!`;
    sendWhatsAppText(rxOrder.patientPhone, msg).catch((e) =>
      console.error("pharmacy webhook patient notify WA", e),
    );
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
