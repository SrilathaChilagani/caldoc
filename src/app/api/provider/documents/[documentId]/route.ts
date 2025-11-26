import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProviderSession, requireAdminSession } from "@/lib/auth.server";
import { getSignedS3Url } from "@/lib/s3";
import { getErrorMessage } from "@/lib/errors";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const document = await prisma.patientDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        fileName: true,
        contentType: true,
        key: true,
        appointment: { select: { providerId: true } },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const admin = await requireAdminSession();
    let authorized = Boolean(admin);

    if (!authorized) {
      const provider = await requireProviderSession();
      authorized = provider?.providerId === document.appointment?.providerId;
    }

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const signedUrl = await getSignedS3Url(document.key);
    return NextResponse.redirect(signedUrl, { status: 307 });
  } catch (err) {
    const message = getErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
