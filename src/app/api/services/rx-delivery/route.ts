import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const UNIT_PRICE = Number(process.env.RX_DELIVERY_ITEM_PAISE || 19900);

type ItemPayload = { name: string; qty: number };

function computeAmount(items: ItemPayload[]) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + Math.max(1, Number(item.qty) || 0) * UNIT_PRICE, 0);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: ItemPayload[] = Array.isArray(body?.items)
      ? body.items
          .map((item: unknown) => {
            const value = item as Record<string, unknown>;
            return { name: String(value?.name || "").trim(), qty: Number(value?.qty) || 0 };
          })
          .filter((item: ItemPayload) => item.name && item.qty > 0)
      : [];

    if (!items.length) {
      return NextResponse.json({ error: "Add at least one medicine" }, { status: 400 });
    }

    const amountPaise = computeAmount(items);
    if (!amountPaise || Number.isNaN(amountPaise)) {
      return NextResponse.json({ error: "Unable to compute price" }, { status: 400 });
    }

    const patientName = String(body?.patientName || "").trim();
    const patientPhone = String(body?.patientPhone || "").trim();
    const address = {
      line1: String(body?.address?.line1 || "").trim(),
      line2: String(body?.address?.line2 || "").trim(),
      city: String(body?.address?.city || "").trim(),
      state: String(body?.address?.state || "").trim(),
      postalCode: String(body?.address?.postalCode || "").trim(),
    };

    if (!patientName || !patientPhone || !address.line1 || !address.city || !address.state || !address.postalCode) {
      return NextResponse.json({ error: "Fill all contact and address fields" }, { status: 400 });
    }

    const order = await prisma.rxOrder.create({
      data: {
        patientName,
        patientPhone,
        patientEmail: body?.patientEmail ? String(body.patientEmail) : null,
        address,
        notes: body?.instructions ? String(body.instructions) : null,
        items,
        amountPaise,
        status: "AWAITING_PAYMENT",
      },
    });

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("rx-delivery error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
