import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { thyrocareAdapter } from "@/lib/lab/adapters/thyrocare";
import { redcliffeAdapter } from "@/lib/lab/adapters/redcliffe";
import type { LabAdapter } from "@/lib/lab/types";

export const dynamic = "force-dynamic";

function getAdapter(apiType: string | null | undefined): LabAdapter | null {
  switch (apiType) {
    case "THYROCARE": return thyrocareAdapter;
    case "REDCLIFFE": return redcliffeAdapter;
    default:          return null;
  }
}

function verifySignature(secret: string, rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const incoming = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(incoming, "hex"));
  } catch {
    return false;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> },
) {
  const { partnerId } = await params;

  const partner = await prisma.labPartner.findUnique({
    where: { id: partnerId },
    select: { id: true, apiType: true, webhookSecret: true },
  });

  if (!partner) return NextResponse.json({ error: "Unknown partner" }, { status: 404 });

  const rawBody = await req.text();

  if (partner.webhookSecret) {
    const sig = req.headers.get("x-lab-signature") ?? req.headers.get("x-hub-signature-256");
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

  const labOrder = await prisma.labOrder.findFirst({
    where: { externalOrderId, labPartnerId: partnerId },
    select: {
      id: true,
      status: true,
      patientPhone: true,
      patientName: true,
    },
  });

  if (!labOrder) {
    console.warn(`lab webhook: unknown externalOrderId ${externalOrderId} for partner ${partnerId}`);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const adapter = getAdapter(partner.apiType);
  const newStatus = adapter?.mapStatus(externalStatus) ?? null;

  if (!newStatus || newStatus === labOrder.status) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const agentName  = String(payload.agent_name  ?? payload.collectionAgentName  ?? "").trim() || undefined;
  const agentPhone = String(payload.agent_phone ?? payload.collectionAgentPhone ?? "").trim() || undefined;

  await prisma.$transaction([
    prisma.labOrder.update({
      where: { id: labOrder.id },
      data: {
        status: newStatus,
        ...(agentName  ? { collectionAgentName:  agentName  } : {}),
        ...(agentPhone ? { collectionAgentPhone: agentPhone } : {}),
      },
    }),
    prisma.labOrderEvent.create({
      data: {
        labOrderId:          labOrder.id,
        fromStatus:          labOrder.status,
        toStatus:            newStatus,
        note:                `Partner webhook: ${externalStatus}`,
        collectionAgentName:  agentName,
        collectionAgentPhone: agentPhone,
        actorEmail:          `webhook@partner:${partnerId}`,
      },
    }),
  ]);

  // Notify patient at key milestones
  if (labOrder.patientPhone) {
    let msg: string | null = null;
    if (newStatus === "CONFIRMED" && agentName) {
      msg = `Hi ${labOrder.patientName || "there"}, your CalDoc lab sample collection is confirmed. Agent ${agentName}${agentPhone ? ` (${agentPhone})` : ""} will visit you shortly.`;
    } else if (newStatus === "SAMPLE_COLLECTED") {
      msg = `Hi ${labOrder.patientName || "there"}, your lab sample has been collected. We'll notify you when your reports are ready.`;
    } else if (newStatus === "REPORTS_READY") {
      msg = `Hi ${labOrder.patientName || "there"}, your CalDoc lab reports are ready! Log in to view and download them.`;
    }
    if (msg) {
      sendWhatsAppText(labOrder.patientPhone, msg).catch((e) =>
        console.error("lab webhook patient notify WA", e),
      );
    }
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
