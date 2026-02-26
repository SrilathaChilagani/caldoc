import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLabsSession } from "@/lib/auth.server";
import { uploadToS3 } from "@/lib/s3";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const sess = await requireLabsSession();
    if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderId } = await params;

    const order = await prisma.labOrder.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 10 MB" }, { status: 400 });
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only PDF, JPG, or PNG files are accepted" }, { status: 400 });
    }

    const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
    const key = `lab-results/${orderId}/result-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadToS3({ key, contentType: file.type, body: buffer });

    await prisma.$transaction(async (tx) => {
      await tx.labOrder.update({
        where: { id: orderId },
        data: { status: "REPORTS_READY" },
      });
      await tx.labOrderEvent.create({
        data: {
          labOrderId: orderId,
          fromStatus: order.status,
          toStatus: "REPORTS_READY",
          note: `Results uploaded: ${key}`,
          actorEmail: sess.email,
        },
      });
    });

    return NextResponse.json({ ok: true, key });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
