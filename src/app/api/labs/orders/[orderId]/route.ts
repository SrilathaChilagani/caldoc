import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession, requireLabsSession } from "@/lib/auth.server";

const ALLOWED = ["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "SAMPLE_COLLECTED", "PROCESSING", "REPORTS_READY", "COMPLETED", "CANCELLED"];

type RouteParams = {
  params: Promise<{ orderId: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  const labsSess = await requireLabsSession();
  const adminSess = !labsSess ? await requireAdminSession() : null;
  if (!labsSess && !adminSess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actorEmail = labsSess?.email ?? "admin";

  const body = await req.json().catch(() => ({}));
  const status = String(body.status || "").toUpperCase();
  const note = String(body.note || "").trim().slice(0, 500) || null;
  const collectionAgentName = String(body.collectionAgentName || "").trim() || null;
  const collectionAgentPhone = String(body.collectionAgentPhone || "").trim() || null;

  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid or missing status." }, { status: 400 });
  }

  const { orderId } = await params;
  const order = await prisma.labOrder.findUnique({ where: { id: orderId }, select: { id: true, status: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const updateData: Record<string, unknown> = { status };
  if (collectionAgentName) updateData.collectionAgentName = collectionAgentName;
  if (collectionAgentPhone) updateData.collectionAgentPhone = collectionAgentPhone;

  await prisma.$transaction([
    prisma.labOrder.update({ where: { id: orderId }, data: updateData }),
    prisma.labOrderEvent.create({
      data: {
        labOrderId: orderId,
        fromStatus: order.status,
        toStatus: status,
        note,
        collectionAgentName,
        collectionAgentPhone,
        actorEmail,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
