import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import { computeTds, getFinancialYear } from "@/lib/finance";

export const dynamic = "force-dynamic";

// GET — list all PENDING payouts, optionally filtered by providerId
export async function GET(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const providerId = searchParams.get("providerId") || undefined;
  const status = searchParams.get("status") || undefined;

  const payouts = await prisma.providerPayout.findMany({
    where: {
      ...(providerId ? { providerId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      provider: { select: { id: true, name: true, speciality: true, panNumber: true, bankAccountName: true, bankIfscCode: true } },
      appointment: { select: { id: true, createdAt: true, feePaise: true } },
      payoutBatch: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(
    payouts.map((p) => ({
      ...p,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      appointment: { ...p.appointment, createdAt: p.appointment.createdAt.toISOString() },
    }))
  );
}

// POST — queue a payout for a completed + paid appointment
// Normally called automatically on appointment COMPLETED + payment CAPTURED — this is for manual queuing
export async function POST(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appointmentId } = await req.json();
  if (!appointmentId) return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      payment: true,
      provider: { select: { id: true, commissionPct: true } },
      providerPayout: true,
    },
  });

  if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  if (appt.providerPayout) return NextResponse.json({ error: "Payout already exists for this appointment" }, { status: 409 });
  if (appt.status !== "COMPLETED") return NextResponse.json({ error: "Appointment is not completed" }, { status: 400 });
  if (appt.payment?.status !== "CAPTURED") return NextResponse.json({ error: "Payment not captured" }, { status: 400 });

  const feePaise = appt.feePaise ?? appt.payment?.amount ?? 0;
  const commissionPct = appt.provider.commissionPct;
  const commissionPaise = Math.round(feePaise * commissionPct / 100);
  const grossPayoutPaise = feePaise - commissionPaise;

  // Get or create TDS ledger for this FY
  const fy = getFinancialYear();
  const tdsLedger = await prisma.tdsLedger.upsert({
    where: { providerId_financialYear: { providerId: appt.providerId, financialYear: fy } },
    create: { providerId: appt.providerId, financialYear: fy, grossPaidPaise: 0, tdsDeducted: 0 },
    update: {},
  });

  const tdsDeductPaise = computeTds({
    payoutAmtPaise: grossPayoutPaise,
    cumulativeGrossPaiseSoFar: tdsLedger.grossPaidPaise,
  });
  const netPayoutPaise = grossPayoutPaise - tdsDeductPaise;

  const payout = await prisma.providerPayout.create({
    data: {
      providerId: appt.providerId,
      appointmentId,
      consultAmtPaise: feePaise,
      commissionPaise,
      grossPayoutPaise,
      tdsDeductPaise,
      netPayoutPaise,
      status: "PENDING",
    },
  });

  return NextResponse.json({
    ...payout,
    paidAt: null,
    createdAt: payout.createdAt.toISOString(),
    updatedAt: payout.updatedAt.toISOString(),
  }, { status: 201 });
}
