import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

// GET — list refund requests
export async function GET(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;

  const refunds = await prisma.refundRequest.findMany({
    where: { ...(status ? { status } : {}) },
    include: {
      payment: {
        include: {
          appointment: { select: { id: true, patientName: true, provider: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(
    refunds.map((r) => ({
      ...r,
      processedAt: r.processedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }))
  );
}

// PATCH /:id — approve or reject a refund
export async function PATCH(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, action, gatewayRefundId, note } = await req.json() as {
    id: string;
    action: "APPROVE" | "REJECT";
    gatewayRefundId?: string;
    note?: string;
  };

  if (!id || !["APPROVE", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "id and action (APPROVE|REJECT) are required" }, { status: 400 });
  }

  const refund = await prisma.refundRequest.findUnique({ where: { id } });
  if (!refund) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (refund.status !== "PENDING") return NextResponse.json({ error: "Refund is not pending" }, { status: 400 });

  const updated = await prisma.refundRequest.update({
    where: { id },
    data: {
      status: action === "APPROVE" ? "PROCESSED" : "REJECTED",
      gatewayRefundId: gatewayRefundId ?? null,
      processedAt: new Date(),
      notes: note ?? null,
    },
  });

  return NextResponse.json({ ...updated, processedAt: updated.processedAt?.toISOString() ?? null, createdAt: updated.createdAt.toISOString() });
}
