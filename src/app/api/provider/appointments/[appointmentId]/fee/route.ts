import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readProviderSession, requireAdminSession } from "@/lib/auth.server";

type RouteContext = {
  params: Promise<{ appointmentId: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { appointmentId } = await context.params;
  const providerSess = await readProviderSession();
  const adminSess = providerSess ? null : await requireAdminSession();

  if (!providerSess && !adminSess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const feePaise = parseFeePayload(body);

  if (!feePaise || feePaise <= 0) {
    return NextResponse.json({ error: "Provide a valid amount greater than zero." }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, providerId: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  if (providerSess && appointment.providerId !== providerSess.pid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { feePaise, feeCurrency: "INR" },
  });

  return NextResponse.json({ ok: true, feePaise });
}

function parseFeePayload(payload: Record<string, unknown>): number | null {
  if (!payload) return null;
  const rawPaise = payload.feePaise ?? payload.amountPaise;
  if (typeof rawPaise === "number" && Number.isFinite(rawPaise) && rawPaise > 0) {
    return Math.round(rawPaise);
  }
  if (typeof rawPaise === "string" && rawPaise.trim()) {
    const parsed = parseInt(rawPaise.trim(), 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const rawRupees = payload.feeRupees ?? payload.amount ?? payload.amountRupees;
  if (typeof rawRupees === "number" && Number.isFinite(rawRupees) && rawRupees > 0) {
    return Math.round(rawRupees * 100);
  }
  if (typeof rawRupees === "string" && rawRupees.trim()) {
    const parsed = Number(rawRupees.trim());
    if (!Number.isNaN(parsed) && parsed > 0) {
      return Math.round(parsed * 100);
    }
  }

  return null;
}
