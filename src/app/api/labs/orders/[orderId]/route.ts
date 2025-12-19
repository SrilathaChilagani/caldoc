import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";

type RouteParams = {
  params: Promise<{ orderId: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status } = await req.json().catch(() => ({}));
  if (!status || typeof status !== "string") {
    return NextResponse.json({ error: "Missing status" }, { status: 400 });
  }

  try {
    const { orderId } = await params;
    await prisma.labOrder.update({
      where: { id: orderId },
      data: { status: status.toUpperCase() },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
