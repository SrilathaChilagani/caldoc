import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import { signPrescription } from "@/lib/leegality";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ rxId: string }> },
) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rxId } = await params;

  const rx = await prisma.prescription.findUnique({
    where: { id: rxId },
    include: {
      appointment: {
        select: {
          provider: {
            select: {
              id: true,
              name: true,
              users: { select: { email: true }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (!rx) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });

  if (rx.signatureStatus === "SIGNED") {
    return NextResponse.json({ error: "Already signed" }, { status: 409 });
  }

  // Mark as PENDING immediately
  await prisma.prescription.update({
    where: { id: rxId },
    data: { signatureStatus: "PENDING" },
  });

  const providerEmail = rx.appointment.provider?.users?.[0]?.email ?? "";
  const providerName = rx.appointment.provider?.name ?? "Provider";

  const result = await signPrescription({
    pdfS3Key: rx.pdfKey,
    signerEmail: providerEmail,
    signerName: providerName,
    rxId,
  });

  if (!result.success) {
    await prisma.prescription.update({
      where: { id: rxId },
      data: { signatureStatus: "FAILED" },
    });
    return NextResponse.json({ error: result.error ?? "eSign failed" }, { status: 502 });
  }

  await prisma.prescription.update({
    where: { id: rxId },
    data: {
      signatureStatus: result.stub ? "PENDING" : "SIGNED",
      signatureDocId: result.documentId ?? null,
      signedAt: result.stub ? null : new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    stub: result.stub ?? false,
    documentId: result.documentId,
    signUrl: result.signUrl,
  });
}
