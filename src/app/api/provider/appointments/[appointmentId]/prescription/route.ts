import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/db";
import { requireProviderSession } from "@/lib/auth.server";
import { uploadToS3 } from "@/lib/s3";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

const DrugCategory = z.enum(["OTC", "LIST_O", "LIST_A", "LIST_B", "SCHEDULE_X"]);

const MedSchema = z.object({
  name: z.string().trim().min(1, "Medicine name required"),
  sig: z.string().trim().optional(),
  qty: z.string().trim().optional(),
  category: DrugCategory,
});

const PayloadSchema = z.object({
  meds: z.array(MedSchema).min(1, "Add at least one medicine"),
});

type RouteContext = {
  params: Promise<{ appointmentId: string }>;
};

function formatCategory(value: z.infer<typeof DrugCategory>) {
  switch (value) {
    case "LIST_O":
      return "List O (OTC)";
    case "LIST_A":
      return "List A";
    case "LIST_B":
      return "List B";
    case "SCHEDULE_X":
      return "Schedule X";
    default:
      return "OTC";
  }
}

async function buildPdf(opts: {
  providerName?: string | null;
  registrationNumber?: string | null;
  councilName?: string | null;
  qualification?: string | null;
  patientName?: string | null;
  appointmentId: string;
  meds: { name: string; sig?: string; qty?: string; category: z.infer<typeof DrugCategory> }[];
}): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const margin = 50;
  const contentWidth = width - margin * 2;
  let cursor = height - margin;

  const drawLine = (
    text: string,
    options: { font?: typeof regularFont; size?: number; color?: ReturnType<typeof rgb>; gap?: number; maxWidth?: number } = {},
  ) => {
    const { font = regularFont, size = 12, color = rgb(0, 0, 0), gap = 6, maxWidth } = options;
    page.drawText(text, {
      x: margin,
      y: cursor,
      font,
      size,
      color,
      maxWidth: maxWidth ?? contentWidth,
    });
    cursor -= size + gap;
  };

  drawLine("CalDoc Prescription", { font: boldFont, size: 20, gap: 14 });
  drawLine(`Provider: ${opts.providerName || "Doctor"}`);
  drawLine(`Qualification: ${opts.qualification || "—"}`);
  drawLine(`RMP Registration #: ${opts.registrationNumber || "—"}`);
  drawLine(`Council: ${opts.councilName || "—"}`);
  drawLine(`Patient: ${opts.patientName || "Patient"}`);
  drawLine(`Appointment ID: ${opts.appointmentId}`, { gap: 12 });

  opts.meds.forEach((med, index) => {
    drawLine(`${index + 1}. ${med.name}`, { font: boldFont, size: 14, gap: 2 });
    drawLine(`Category: ${formatCategory(med.category)}`, { size: 11, gap: 2 });
    if (med.sig) drawLine(`Sig: ${med.sig}`, { size: 11, gap: 2 });
    if (med.qty) drawLine(`Qty: ${med.qty}`, { size: 11, gap: 2 });
    cursor -= 6;
  });

  cursor -= 4;
  drawLine(
    "Issued under the TELEMEDICINE Practice Guidelines (2020). This prescription is for non-emergency use. Seek in-person care for red-flag symptoms or adverse reactions.",
    { size: 10, maxWidth: contentWidth, gap: 4 },
  );
  drawLine("Generated via CalDoc India portal", {
    font: regularFont,
    size: 9,
    color: rgb(0.4, 0.4, 0.4),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireProviderSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appointmentId } = await ctx.params;
    const json = await req.json().catch(() => null);
    const parsed = PayloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { name: true } },
        provider: { select: { name: true, registrationNumber: true, councilName: true, qualification: true } },
      },
    });

    if (!appointment || appointment.providerId !== session.providerId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const pdfBuffer = await buildPdf({
      appointmentId,
      providerName: appointment.provider?.name,
      registrationNumber: appointment.provider?.registrationNumber,
      councilName: appointment.provider?.councilName,
      qualification: appointment.provider?.qualification,
      patientName: appointment.patientName || appointment.patient?.name,
      meds: parsed.data.meds,
    });

    const key = `prescriptions/${appointmentId}/${Date.now()}.pdf`;
    await uploadToS3({ key, contentType: "application/pdf", body: pdfBuffer });

    await prisma.prescription.upsert({
      where: { appointmentId },
      update: { meds: parsed.data.meds, pdfKey: key },
      create: { appointmentId, meds: parsed.data.meds, pdfKey: key },
    });

    await logAudit({
      action: "prescription.save",
      actorType: "PROVIDER",
      actorId: session.userId,
      meta: { appointmentId, meds: parsed.data.meds.map((m) => ({ name: m.name, category: m.category })) },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
