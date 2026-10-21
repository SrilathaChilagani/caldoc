import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const assignments = await prisma.frontDeskUserClinic.findMany({
    where: { frontDeskUserId: id },
    select: {
      id: true,
      assignedAt: true,
      providerClinic: {
        select: {
          id: true,
          clinicName: true,
          city: true,
          state: true,
          provider: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { assignedAt: "asc" },
  });
  return NextResponse.json({ assignments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: frontDeskUserId } = await params;
  const body = await req.json().catch(() => ({}));
  const providerClinicId = String(body.providerClinicId || "").trim();

  if (!providerClinicId) {
    return NextResponse.json({ error: "providerClinicId is required" }, { status: 400 });
  }

  const user = await prisma.frontDeskUser.findUnique({ where: { id: frontDeskUserId } });
  if (!user) return NextResponse.json({ error: "Front desk user not found" }, { status: 404 });

  const clinic = await prisma.providerClinic.findUnique({ where: { id: providerClinicId } });
  if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

  const assignment = await prisma.frontDeskUserClinic.upsert({
    where: { frontDeskUserId_providerClinicId: { frontDeskUserId, providerClinicId } },
    create: { frontDeskUserId, providerClinicId },
    update: {},
    select: {
      id: true,
      assignedAt: true,
      providerClinic: { select: { id: true, clinicName: true, city: true } },
    },
  });
  return NextResponse.json({ assignment }, { status: 201 });
}
