import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import PDFDocument from "pdfkit";
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

function buildPdf(opts: {
  providerName?: string | null;
  registrationNumber?: string | null;
  councilName?: string | null;
  qualification?: string | null;
  patientName?: string | null;
  appointmentId: string;
  meds: { name: string; sig?: string; qty?: string; category: z.infer<typeof DrugCategory> }[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("Telemed Prescription", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Provider: ${opts.providerName || "Doctor"}`);
    doc.text(`Qualification: ${opts.qualification || "—"}`);
    doc.text(`RMP Registration #: ${opts.registrationNumber || "—"}`);
    doc.text(`Council: ${opts.councilName || "—"}`);
    doc.text(`Patient: ${opts.patientName || "Patient"}`);
    doc.text(`Appointment ID: ${opts.appointmentId}`);
    doc.moveDown();

    opts.meds.forEach((med, index) => {
      doc.fontSize(14).text(`${index + 1}. ${med.name}`);
      doc.fontSize(11).text(`Category: ${formatCategory(med.category)}`);
      if (med.sig) doc.fontSize(11).text(`Sig: ${med.sig}`);
      if (med.qty) doc.fontSize(11).text(`Qty: ${med.qty}`);
      doc.moveDown(0.5);
    });

    doc.moveDown();
    doc
      .fontSize(10)
      .text(
        "Issued under the Telemedicine Practice Guidelines (2020). This prescription is for non-emergency use. Seek in-person care for red-flag symptoms or adverse reactions.",
        { align: "left" },
      );
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor("gray").text("Generated via Telemed India portal", { align: "right" });
    doc.end();
  });
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
      patientName: appointment.patient?.name,
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
