import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; clinicId: string }> },
) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: frontDeskUserId, clinicId: providerClinicId } = await params;
  await prisma.frontDeskUserClinic.deleteMany({
    where: { frontDeskUserId, providerClinicId },
  });
  return NextResponse.json({ ok: true });
}
