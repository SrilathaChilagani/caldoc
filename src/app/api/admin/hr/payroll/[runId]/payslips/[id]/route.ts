import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ runId: string; id: string }> };

// PATCH — mark individual payslip PAID | HELD | PENDING
export async function PATCH(req: NextRequest, { params }: Params) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, runId } = await params;
  const { status, paymentRef, notes } = await req.json();

  if (!["PAID", "HELD", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const payslip = await prisma.payslip.update({
    where: { id, payrollRunId: runId },
    data: {
      status,
      paidAt: status === "PAID" ? new Date() : null,
      paymentRef: paymentRef ?? null,
      notes: notes ?? null,
    },
  });

  return NextResponse.json({
    ...payslip,
    paidAt: payslip.paidAt?.toISOString() ?? null,
    createdAt: payslip.createdAt.toISOString(),
    updatedAt: payslip.updatedAt.toISOString(),
  });
}
