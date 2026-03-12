import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFrontDeskSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "PENDING", "AWAITING_PAYMENT", "CONFIRMED", "SAMPLE_COLLECTED",
  "PROCESSING", "REPORTS_READY", "COMPLETED", "CANCELLED",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requireFrontDeskSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status, labPartnerId, note, collectionAgentName, collectionAgentPhone } = body as {
    status?: string;
    labPartnerId?: string | null;
    note?: string;
    collectionAgentName?: string;
    collectionAgentPhone?: string;
  };

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = await prisma.labOrder.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (labPartnerId !== undefined) updateData.labPartnerId = labPartnerId || null;
  if (collectionAgentName !== undefined) updateData.collectionAgentName = collectionAgentName;
  if (collectionAgentPhone !== undefined) updateData.collectionAgentPhone = collectionAgentPhone;

  await prisma.$transaction([
    prisma.labOrder.update({ where: { id }, data: updateData }),
    ...(status
      ? [prisma.labOrderEvent.create({
          data: {
            labOrderId: id,
            fromStatus: order.status,
            toStatus: status,
            note: note || null,
            collectionAgentName: collectionAgentName || null,
            collectionAgentPhone: collectionAgentPhone || null,
            actorEmail: sess.email || "frontdesk",
          },
        })]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}
