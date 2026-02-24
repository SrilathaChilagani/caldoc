import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

const ALLOWED = ["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "SAMPLE_COLLECTED", "PROCESSING", "REPORTS_READY", "COMPLETED", "CANCELLED"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || "").toUpperCase();
  const note = String(body.note || "").trim().slice(0, 500) || null;
  const collectionAgentName = String(body.collectionAgentName || "").trim() || null;
  const collectionAgentPhone = String(body.collectionAgentPhone || "").trim() || null;

  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Allowed: ${ALLOWED.join(", ")}` }, { status: 400 });
  }

  const order = await prisma.labOrder.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const updateData: Record<string, unknown> = { status };
  if (collectionAgentName) updateData.collectionAgentName = collectionAgentName;
  if (collectionAgentPhone) updateData.collectionAgentPhone = collectionAgentPhone;

  await prisma.$transaction([
    prisma.labOrder.update({ where: { id }, data: updateData }),
    prisma.labOrderEvent.create({
      data: {
        labOrderId: id,
        fromStatus: order.status,
        toStatus: status,
        note,
        collectionAgentName,
        collectionAgentPhone,
        actorEmail: "admin",
      },
    }),
  ]);

  return NextResponse.json({ ok: true, status });
}
