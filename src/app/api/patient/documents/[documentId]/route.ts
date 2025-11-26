import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readPatientSession } from "@/lib/patientAuth.server";
import { getSignedS3Url } from "@/lib/s3";

type RouteCtx = {
  params: Promise<{ documentId: string }>;
};

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const session = await readPatientSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await ctx.params;
  const patient = await prisma.patient.findUnique({
    where: { phone: session.phone },
    select: { id: true },
  });
  if (!patient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const document = await prisma.patientDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      patientId: true,
      fileName: true,
      key: true,
      contentType: true,
    },
  });
  if (!document || document.patientId !== patient.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const signedUrl = await getSignedS3Url(document.key);
  return NextResponse.redirect(signedUrl, { status: 307 });
}
