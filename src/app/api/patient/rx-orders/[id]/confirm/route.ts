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
    include: {
      rxOrderItems: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Verify patient owns this order
  const patientLast10 = buildLast10(patientPhone);
  const orderPatientLast10 = buildLast10(order.patientPhone);
  if (!patientLast10 || patientLast10 !== orderPatientLast10) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (order.status !== "QUOTE_READY") {
    return NextResponse.json(
      { error: `Order is ${order.status}, expected QUOTE_READY` },
      { status: 400 },
    );
  }

  // Check quote not expired
  if (order.quoteExpiresAt && order.quoteExpiresAt < new Date()) {
    return NextResponse.json({ error: "Quote has expired" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({})) as { approvedSubstitutions?: string[] };
  const approvedSubstitutions: string[] = Array.isArray(body.approvedSubstitutions)
    ? body.approvedSubstitutions
    : [];

  // Compute final amount from AVAILABLE items + approved SUBSTITUTED items
  let amountPaise = 0;
  const confirmedItems: Array<{ name: string; qty: number; price: number }> = [];

  for (const item of order.rxOrderItems) {
    if (item.status === "AVAILABLE") {
      const qty = item.qtyDispensed ?? 1;
      const price = item.unitPricePaise ?? 0;
      amountPaise += qty * price;
      confirmedItems.push({ name: item.dispensedName ?? item.name, qty, price });
    } else if (item.status === "SUBSTITUTED" && approvedSubstitutions.includes(item.id)) {
      const qty = item.qtyDispensed ?? 1;
      const price = item.unitPricePaise ?? 0;
      amountPaise += qty * price;
      confirmedItems.push({ name: item.dispensedName ?? item.name, qty, price });
    }
  }

  await prisma.$transaction(async (tx) => {
    // Update substitution approval status
    for (const item of order.rxOrderItems) {
      if (item.status === "SUBSTITUTED") {
        const approved = approvedSubstitutions.includes(item.id);
        await tx.rxOrderItem.update({
          where: { id: item.id },
          data: {
            substituteApproved: approved,
            status: approved ? "SUBSTITUTED" : "REJECTED_BY_PATIENT",
          },
        });
      }
    }

    await tx.rxOrder.update({
      where: { id },
      data: {
        status: "AWAITING_PAYMENT",
        amountPaise,
        items: confirmedItems,
      },
    });

    await tx.rxOrderEvent.create({
      data: {
        rxOrderId: id,
        fromStatus: "QUOTE_READY",
        toStatus: "AWAITING_PAYMENT",
        note: `Patient confirmed order. ${approvedSubstitutions.length} substitution(s) approved.`,
        actorEmail: patientPhone,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    paymentUrl: `/services/rx-delivery/pay?order=${id}`,
  });
}
