import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = (body?.reason as string)?.trim();
  const adminEmail = (body?.adminEmail as string) || "admin";

  if (!reason) return NextResponse.json({ error: "Reason is required" }, { status: 400 });

  const enrollment = await prisma.pharmacyEnrollment.findUnique({ where: { id } });
  if (!enrollment) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  if (enrollment.status !== "PENDING") {
    return NextResponse.json({ error: "Enrollment is not in PENDING status" }, { status: 409 });
  }

  await prisma.pharmacyEnrollment.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedByEmail: adminEmail,
      rejectionReason: reason,
    },
  });

  logAudit({ action: "PHARMACY_ENROLLMENT_REJECTED", actorType: "ADMIN", actorId: sess.userId, meta: { enrollmentId: id, reason } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
