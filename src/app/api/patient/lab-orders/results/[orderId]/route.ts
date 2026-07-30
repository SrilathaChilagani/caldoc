import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readPatientPhone } from "@/lib/patientAuth.server";
import { getSignedS3Url } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const phone = await readPatientPhone();
  if (!phone) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await params;

  const order = await prisma.labOrder.findUnique({
    where: { id: orderId },
    select: { resultsPdfKey: true, patientPhone: true, patientId: true, status: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify ownership: match by phone suffix or patientId
  const last10 = phone.replace(/\D/g, "").slice(-10);
  const orderPhone = (order.patientPhone || "").replace(/\D/g, "").slice(-10);
  const phonesMatch = last10 && orderPhone && last10 === orderPhone;

  if (!phonesMatch) {
    // Fallback: check via Patient record
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { phone: { contains: last10 } },
          { phone: last10 },
          { phone: `+91${last10}` },
          { phone: `91${last10}` },
        ],
      },
      select: { id: true },
    });
    if (!patient || order.patientId !== patient.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!order.resultsPdfKey) {
    return NextResponse.json({ error: "Results not available yet" }, { status: 404 });
  }

  const signedUrl = await getSignedS3Url(order.resultsPdfKey, 120);
  return NextResponse.redirect(signedUrl, { status: 307 });
}
