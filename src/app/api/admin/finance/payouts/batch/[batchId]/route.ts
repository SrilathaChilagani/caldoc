import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import { getFinancialYear } from "@/lib/finance";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ batchId: string }> };

// PATCH — mark batch COMPLETED or FAILED; updates individual payouts + TDS ledger
export async function PATCH(req: NextRequest, { params }: Params) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { batchId } = await params;
  const { action, note } = await req.json() as { action: "COMPLETE" | "FAIL"; note?: string };

  if (!["COMPLETE", "FAIL"].includes(action)) {
    return NextResponse.json({ error: "action must be COMPLETE or FAIL" }, { status: 400 });
  }

  const batch = await prisma.payoutBatch.findUnique({
    where: { id: batchId },
    include: { payouts: { select: { id: true, providerId: true, grossPayoutPaise: true, tdsDeductPaise: true } } },
  });

  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.status !== "PROCESSING") return NextResponse.json({ error: "Batch is not in PROCESSING state" }, { status: 400 });

  const now = new Date();
  const fy = getFinancialYear(now);

  if (action === "COMPLETE") {
    // Update all payouts to PAID + update TDS ledgers
    await prisma.$transaction([
      prisma.providerPayout.updateMany({
        where: { payoutBatchId: batchId },
        data: { status: "PAID", paidAt: now },
      }),
      prisma.payoutBatch.update({
        where: { id: batchId },
        data: { status: "COMPLETED", processedAt: now, note: note ?? batch.note },
      }),
    ]);

    // Update TDS ledger per provider (outside transaction for upsert)
    const byProvider: Record<string, { gross: number; tds: number }> = {};
    for (const p of batch.payouts) {
      if (!byProvider[p.providerId]) byProvider[p.providerId] = { gross: 0, tds: 0 };
      byProvider[p.providerId].gross += p.grossPayoutPaise;
      byProvider[p.providerId].tds += p.tdsDeductPaise;
    }
    for (const [providerId, { gross, tds }] of Object.entries(byProvider)) {
      await prisma.tdsLedger.upsert({
        where: { providerId_financialYear: { providerId, financialYear: fy } },
        create: { providerId, financialYear: fy, grossPaidPaise: gross, tdsDeducted: tds },
        update: { grossPaidPaise: { increment: gross }, tdsDeducted: { increment: tds } },
      });
    }
  } else {
    await prisma.$transaction([
      prisma.providerPayout.updateMany({
        where: { payoutBatchId: batchId },
        data: { status: "FAILED" },
      }),
      prisma.payoutBatch.update({
        where: { id: batchId },
        data: { status: "FAILED", processedAt: now, note: note ?? batch.note },
      }),
    ]);
  }

  const updated = await prisma.payoutBatch.findUnique({ where: { id: batchId } });
  return NextResponse.json({
    ...updated!,
    processedAt: updated!.processedAt?.toISOString() ?? null,
    createdAt: updated!.createdAt.toISOString(),
    updatedAt: updated!.updatedAt.toISOString(),
  });
}
