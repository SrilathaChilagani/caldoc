import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readPatientPhone } from "@/lib/patientAuth.server";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const patientPhone = await readPatientPhone();
  if (!patientPhone) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { phone: patientPhone },
    select: { id: true },
  });
  if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const followUp = await prisma.followUpRequest.findUnique({
    where: { id },
    select: { id: true, patientId: true, status: true },
  });

  if (!followUp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (followUp.patientId !== patient.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["PENDING", "NOTIFIED"].includes(followUp.status)) {
    return NextResponse.json({ error: `Cannot dismiss follow-up in status ${followUp.status}` }, { status: 400 });
  }

  await prisma.followUpRequest.update({
    where: { id },
    data: { status: "DISMISSED" },
  });

  return NextResponse.json({ ok: true });
}
