import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLabsSession } from "@/lib/auth.server";
import { getSignedS3Url } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const sess = await requireLabsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await params;

  const order = await prisma.labOrder.findUnique({
    where: { id: orderId },
    select: { resultsPdfKey: true, labPartnerId: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (sess.labPartnerId && order.labPartnerId !== sess.labPartnerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!order.resultsPdfKey) {
    return NextResponse.json({ error: "No results uploaded yet" }, { status: 404 });
  }

  const signedUrl = await getSignedS3Url(order.resultsPdfKey, 120);
  return NextResponse.redirect(signedUrl, { status: 307 });
}
