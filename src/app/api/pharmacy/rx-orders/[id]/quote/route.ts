import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePharmacySession } from "@/lib/auth.server";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const QuoteBodySchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string(),
      status: z.enum(["AVAILABLE", "SUBSTITUTED", "UNAVAILABLE"]),
      unitPricePaise: z.number().int().min(0).optional(),
      qtyDispensed: z.number().int().min(1).optional(),
      dispensedName: z.string().optional(),
      dispensedSig: z.string().optional(),
      note: z.string().optional(),
    }),
  ),
  quoteNote: z.string().optional(),
  rejectOrder: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requirePharmacySession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const order = await prisma.rxOrder.findUnique({
    where: { id },
    include: {
      rxOrderItems: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Partner-scoped access
  if (sess.pharmacyPartnerId && order.pharmacyPartnerId !== sess.pharmacyPartnerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (order.status !== "QUOTE_PENDING") {
    return NextResponse.json(
      { error: `Order is ${order.status}, expected QUOTE_PENDING` },
      { status: 400 },
    );
  }

  const parsed = QuoteBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
  }

  const { items: itemUpdates, quoteNote, rejectOrder } = parsed.data;

  // Handle full rejection
  if (rejectOrder) {
    await prisma.$transaction([
      prisma.rxOrder.update({
        where: { id },
        data: { status: "REJECTED", quoteNote: quoteNote ?? "Order rejected by pharmacy" },
      }),
      prisma.rxOrderEvent.create({
        data: {
          rxOrderId: id,
          fromStatus: "QUOTE_PENDING",
          toStatus: "REJECTED",
          note: quoteNote ?? "Order rejected by pharmacy",
          actorEmail: sess.email ?? "pharmacy",
        },
      }),
    ]);

    if (order.patientPhone) {
      sendWhatsAppText(
        order.patientPhone,
        `Hi ${order.patientName}, unfortunately your CalDoc pharmacy order could not be fulfilled: ${quoteNote ?? "Order rejected by pharmacy"}. Please contact us for assistance.`,
      ).catch((e) => console.error("pharmacy reject WA", e));
    }

    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  // Validate all order items are covered
  const orderItemIds = new Set(order.rxOrderItems.map((i) => i.id));
  for (const u of itemUpdates) {
    if (!orderItemIds.has(u.itemId)) {
      return NextResponse.json(
        { error: `Item ${u.itemId} does not belong to this order` },
        { status: 400 },
      );
    }
  }
  const coveredIds = new Set(itemUpdates.map((u) => u.itemId));
  const missingItems = order.rxOrderItems.filter((i) => !coveredIds.has(i.id));
  if (missingItems.length > 0) {
    return NextResponse.json(
      { error: `Missing quote for items: ${missingItems.map((i) => i.name).join(", ")}` },
      { status: 400 },
    );
  }

  // Compute quoted amount
  let quotedAmountPaise = 0;
  for (const u of itemUpdates) {
    if (u.status === "AVAILABLE" || u.status === "SUBSTITUTED") {
      const qty = u.qtyDispensed ?? 1;
      const price = u.unitPricePaise ?? 0;
      quotedAmountPaise += qty * price;
    }
  }

  // Check if ALL items unavailable
  const allUnavailable = itemUpdates.every((u) => u.status === "UNAVAILABLE");
  const newStatus = allUnavailable ? "REJECTED" : "QUOTE_READY";
  const finalNote = allUnavailable
    ? "All items unavailable"
    : (quoteNote ?? null);

  // Update each RxOrderItem + order in transaction
  await prisma.$transaction(async (tx) => {
    for (const u of itemUpdates) {
      await tx.rxOrderItem.update({
        where: { id: u.itemId },
        data: {
          status: u.status,
          unitPricePaise: u.unitPricePaise ?? null,
          qtyDispensed: u.qtyDispensed ?? null,
          dispensedName: u.dispensedName ?? null,
          dispensedSig: u.dispensedSig ?? null,
          note: u.note ?? null,
        },
      });
    }

    await tx.rxOrder.update({
      where: { id },
      data: {
        status: newStatus,
        quotedAmountPaise,
        quoteNote: finalNote,
      },
    });

    await tx.rxOrderEvent.create({
      data: {
        rxOrderId: id,
        fromStatus: "QUOTE_PENDING",
        toStatus: newStatus,
        note: finalNote,
        actorEmail: sess.email ?? "pharmacy",
      },
    });
  });

  // Notify patient
  if (order.patientPhone) {
    if (newStatus === "QUOTE_READY") {
      const availCount = itemUpdates.filter((u) => u.status === "AVAILABLE").length;
      const subCount = itemUpdates.filter((u) => u.status === "SUBSTITUTED").length;
      const unavailCount = itemUpdates.filter((u) => u.status === "UNAVAILABLE").length;
      const totalMeds = order.rxOrderItems.length;
      sendWhatsAppText(
        order.patientPhone,
        `Hi ${order.patientName}, your pharmacy quote for ${totalMeds} medicine(s) is ready. ${availCount} available, ${subCount} substitution(s) suggested, ${unavailCount} unavailable. Review and confirm at caldoc.in/patient/rx-orders/${id}/review`,
      ).catch((e) => console.error("quote ready patient WA", e));
    } else {
      sendWhatsAppText(
        order.patientPhone,
        `Hi ${order.patientName}, unfortunately your CalDoc pharmacy order could not be fulfilled: All items unavailable. Please contact us for assistance.`,
      ).catch((e) => console.error("all unavail WA", e));
    }
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
