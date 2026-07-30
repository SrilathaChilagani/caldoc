import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePharmacySession } from "@/lib/auth.server";
import { getSignedS3Url } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requirePharmacySession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const order = await prisma.rxOrder.findUnique({
    where: { id },
    select: { rxDocumentKey: true, pharmacyPartnerId: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (sess.pharmacyPartnerId && order.pharmacyPartnerId !== sess.pharmacyPartnerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!order.rxDocumentKey) {
    return NextResponse.json({ error: "No prescription document attached" }, { status: 404 });
  }

  const signedUrl = await getSignedS3Url(order.rxDocumentKey, 120);
  return NextResponse.redirect(signedUrl, { status: 307 });
}
