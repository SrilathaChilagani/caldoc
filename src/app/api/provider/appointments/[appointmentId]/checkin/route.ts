import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { downloadFromS3 } from "@/lib/s3";
import { readProviderSession, requireAdminSession } from "@/lib/auth.server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await params;

  const providerSess = await readProviderSession();
  const adminSess = await requireAdminSession();
  if (!providerSess && !adminSess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkIn = await prisma.checkInForm.findUnique({
    where: { appointmentId },
    select: { s3Key: true, completedAt: true, chiefComplaint: true },
  });

  if (!checkIn || !checkIn.completedAt) {
    return NextResponse.json({ error: "Check-in not completed" }, { status: 404 });
  }

  if (!checkIn.s3Key) {
    return NextResponse.json({ error: "Form data not available" }, { status: 404 });
  }

  try {
    const buffer = await downloadFromS3(checkIn.s3Key);
    const formData = JSON.parse(buffer.toString("utf-8"));
    return NextResponse.json({ ok: true, completedAt: checkIn.completedAt, formData });
  } catch (err) {
    console.error("[provider/checkin] S3 download failed:", err);
    return NextResponse.json({ error: "Could not load form data" }, { status: 500 });
  }
}
