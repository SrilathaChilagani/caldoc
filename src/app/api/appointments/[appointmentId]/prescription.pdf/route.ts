import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProviderSession } from "@/lib/auth.server";
import { readPatientSession } from "@/lib/patientAuth.server";
import { getSignedS3Url } from "@/lib/s3";
import { getErrorMessage } from "@/lib/errors";
import { phonesShareLast10 } from "@/lib/phone";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  try {
    const { appointmentId } = await params;
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        providerId: true,
        patient: { select: { phone: true } },
        prescription: { select: { pdfKey: true } },
      },
    });

    if (!appointment || !appointment.prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    const providerSession = await requireProviderSession();
    let authorized = providerSession?.providerId === appointment.providerId;

    if (!authorized) {
      const patientSession = await readPatientSession();
      if (patientSession && phonesShareLast10(patientSession.phone, appointment.patient?.phone)) {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const signedUrl = await getSignedS3Url(appointment.prescription.pdfKey);
    return NextResponse.redirect(signedUrl, { status: 307 });
  } catch (err) {
    const message = getErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
