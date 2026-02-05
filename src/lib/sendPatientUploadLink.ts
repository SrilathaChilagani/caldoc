import { prisma } from "@/lib/db";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { getErrorMessage } from "@/lib/errors";
import { createPatientUploadToken } from "@/lib/patientUploadToken";

type AppointmentForUpload = {
  id: string;
  patientId: string | null;
  uploadLinkSentAt: Date | null;
  patientName?: string | null;
  patient: { phone: string | null; name?: string | null } | null;
  provider: { name?: string | null } | null;
};

const DEFAULT_TEMPLATE =
  process.env.WHATSAPP_TMPL_UPLOAD || "WHATSAPP_UPLOAD_Template";

export async function sendPatientUploadLink(
  appt: AppointmentForUpload | null,
  baseUrl: string
) {
  if (!appt || !appt.patientId || !appt.patient?.phone) return;
  if (appt.uploadLinkSentAt) return;

  const token = createPatientUploadToken({
    appointmentId: appt.id,
    patientId: appt.patientId,
  });
  const uploadUrl = `${baseUrl}/p/upload?token=${encodeURIComponent(token)}`;

  const template = DEFAULT_TEMPLATE;
  const lang = process.env.WHATSAPP_LANG || "en_US";
  const displayName = appt.patientName || appt.patient?.name || "Patient";
  const vars =
    template === "hello_world"
      ? []
      : [
          displayName,
          uploadUrl,
          appt.provider?.name || "Doctor",
        ];

  try {
    const result = await sendWhatsAppTemplate({
      to: appt.patient.phone,
      template,
      lang,
      vars,
    });
    await prisma.outboundMessage.create({
      data: {
        appointmentId: appt.id,
        channel: "WHATSAPP",
        toPhone: appt.patient.phone,
        template,
        body: `Upload link: ${uploadUrl}`,
        messageId: result?.messageId,
        status: "SENT",
        kind: "PATIENT_DOC_LINK",
      },
    });
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { uploadLinkSentAt: new Date() },
    });
  } catch (err: unknown) {
    await prisma.outboundMessage.create({
      data: {
        appointmentId: appt.id,
        channel: "WHATSAPP",
        toPhone: appt.patient.phone,
        template,
        body: "Upload link send failed",
        status: "FAILED",
        error: getErrorMessage(err),
        kind: "PATIENT_DOC_LINK",
      },
    });
  }
}
