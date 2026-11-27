import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readPatientSession } from "@/lib/patientAuth.server";

export const dynamic = "force-dynamic";

// POST /api/patient/dsr
// Patient submits a data subject request (DPDP right to erasure, access, etc.)
export async function POST(req: NextRequest) {
  const sess = await readPatientSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patient = await prisma.patient.findUnique({
    where: { phone: sess.phone },
    select: { id: true },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const body = await req.json();
  const { type, notes } = body as { type?: string; notes?: string };

  const VALID_TYPES = ["ERASURE", "ACCESS", "PORTABILITY", "RECTIFICATION"];
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  // Check for an open request of same type to avoid duplicates
  const existing = await prisma.dataSubjectRequest.findFirst({
    where: {
      patientId: patient.id,
      type,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An open request of this type already exists", id: existing.id },
      { status: 409 },
    );
  }

  const dsr = await prisma.dataSubjectRequest.create({
    data: { patientId: patient.id, type, notes: notes ?? null },
    select: { id: true, type: true, status: true, requestedAt: true },
  });

  return NextResponse.json({ dsr }, { status: 201 });
}

// GET /api/patient/dsr — patient views their own DSRs
export async function GET(_req: NextRequest) {
  const sess = await readPatientSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patient = await prisma.patient.findUnique({
    where: { phone: sess.phone },
    select: { id: true },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const requests = await prisma.dataSubjectRequest.findMany({
    where: { patientId: patient.id },
    select: { id: true, type: true, status: true, requestedAt: true, resolvedAt: true },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json({ requests });
}
