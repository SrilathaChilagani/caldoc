import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import { getFinancialYear } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fy = searchParams.get("fy") || getFinancialYear();

  const ledger = await prisma.tdsLedger.findMany({
    where: { financialYear: fy },
    include: {
      provider: { select: { id: true, name: true, panNumber: true, speciality: true } },
    },
    orderBy: { tdsDeducted: "desc" },
  });

  const totals = ledger.reduce(
    (acc, l) => ({ gross: acc.gross + l.grossPaidPaise, tds: acc.tds + l.tdsDeducted }),
    { gross: 0, tds: 0 }
  );

  return NextResponse.json({
    financialYear: fy,
    totals,
    entries: ledger.map((l) => ({
      providerId: l.providerId,
      providerName: l.provider.name,
      providerPan: l.provider.panNumber,
      speciality: l.provider.speciality,
      grossPaidPaise: l.grossPaidPaise,
      tdsDeducted: l.tdsDeducted,
      updatedAt: l.updatedAt.toISOString(),
    })),
  });
}
