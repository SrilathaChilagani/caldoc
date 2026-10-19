import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readPatientPhone } from "@/lib/patientAuth.server";

export const dynamic = "force-dynamic";

function buildLast10(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const patientPhone = await readPatientPhone();
  if (!patientPhone) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.rxOrder.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      patientPhone: true,
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Verify patient owns this order
  const patientLast10 = buildLast10(patientPhone);
  const orderPatientLast10 = buildLast10(order.patientPhone);
  if (!patientLast10 || patientLast10 !== orderPatientLast10) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!["QUOTE_READY", "QUOTE_PENDING"].includes(order.status)) {
    return NextResponse.json(
      { error: `Cannot cancel order in status ${order.status}` },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.rxOrder.update({
      where: { id },
      data: { status: "CANCELLED" },
    }),
    prisma.rxOrderEvent.create({
      data: {
        rxOrderId: id,
        fromStatus: order.status,
        toStatus: "CANCELLED",
        note: "Cancelled by patient",
        actorEmail: patientPhone,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
