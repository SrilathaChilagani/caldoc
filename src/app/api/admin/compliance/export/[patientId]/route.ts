import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

// GET /api/admin/compliance/export/[patientId]
// Returns a full data export for the patient (DPDP right to access / portability).
// Returned as JSON — caller can stringify and offer as a .json download.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { patientId } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      dob: true,
      sex: true,
      consentAt: true,
      createdAt: true,
      addresses: {
        select: { line1: true, line2: true, city: true, state: true, postalCode: true },
      },
      appointments: {
        select: {
          id: true,
          status: true,
          visitMode: true,
          createdAt: true,
          provider: { select: { name: true, speciality: true } },
          slot: { select: { startsAt: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      labOrders: {
        select: { id: true, tests: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      rxOrders: {
        select: { id: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      ratings: {
        select: { rating: true, comment: true, createdAt: true },
      },
      dataSubjectRequests: {
        select: { type: true, status: true, requestedAt: true, resolvedAt: true },
        orderBy: { requestedAt: "desc" },
      },
    },
  });

  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    exportedBy: sess.userId,
    patient,
  });
}
