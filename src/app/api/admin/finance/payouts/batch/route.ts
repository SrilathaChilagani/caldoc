import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

// GET — list payout batches
export async function GET(_req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batches = await prisma.payoutBatch.findMany({
    include: {
      _count: { select: { payouts: true } },
      createdByAdmin: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    batches.map((b) => ({
      ...b,
      processedAt: b.processedAt?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }))
  );
}

// POST — create a new payout batch from PENDING payouts
export async function POST(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { payoutIds, note } = await req.json() as { payoutIds?: string[]; note?: string };

  // If no specific IDs, pick all PENDING payouts
  const payouts = await prisma.providerPayout.findMany({
    where: {
      status: "PENDING",
      payoutBatchId: null,
      ...(payoutIds ? { id: { in: payoutIds } } : {}),
    },
    select: { id: true, grossPayoutPaise: true, tdsDeductPaise: true, netPayoutPaise: true },
  });

  if (payouts.length === 0) {
    return NextResponse.json({ error: "No PENDING payouts found" }, { status: 400 });
  }

  const totalGrossPaise = payouts.reduce((s, p) => s + p.grossPayoutPaise, 0);
  const totalTdsPaise = payouts.reduce((s, p) => s + p.tdsDeductPaise, 0);
  const totalNetPaise = payouts.reduce((s, p) => s + p.netPayoutPaise, 0);

  const batch = await prisma.payoutBatch.create({
    data: {
      totalGrossPaise,
      totalTdsPaise,
      totalNetPaise,
      note: note ?? null,
      createdBy: sess.userId,
      payouts: { connect: payouts.map((p) => ({ id: p.id })) },
    },
  });

  // Update all payouts to PROCESSING
  await prisma.providerPayout.updateMany({
    where: { id: { in: payouts.map((p) => p.id) } },
    data: { status: "PROCESSING", payoutBatchId: batch.id },
  });

  return NextResponse.json({
    ...batch,
    processedAt: null,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
    payoutCount: payouts.length,
  }, { status: 201 });
}
