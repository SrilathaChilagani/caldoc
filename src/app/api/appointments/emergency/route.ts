import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { getErrorMessage } from "@/lib/errors";
import { sendWhatsAppText } from "@/lib/whatsapp";

// Default emergency fee: ₹499
const EMERGENCY_FEE_PAISE = Number(process.env.EMERGENCY_FEE_PAISE || 49900);

function appBaseUrl() {
  return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";
}

const CANONICAL_CONSENT_TEXT =
  "I confirm that I have read the disclaimer and terms, understand that this is a telemedicine consultation with limitations that may not replace in-person care, consent to a teleconsultation with a registered medical practitioner (NMC/State Medical Council registered), and acknowledge that Schedule X controlled drugs cannot be prescribed via telemedicine.";

type EmergencyPayload = {
  name?: string;
  phone?: string;
  visitMode?: "VIDEO" | "AUDIO";
  symptoms?: string[];
  notes?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EmergencyPayload;
    const name = body.name?.trim();
    const phone = body.phone?.trim();

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: "Patient name must be under 100 characters" }, { status: 400 });
    }

    const meta = buildPatientPhoneMeta(phone);
    if (!meta) {
      return NextResponse.json(
        { error: "Enter a valid phone number with country code (e.g. +91 for India)" },
        { status: 400 }
      );
    }

    // Resolve the emergency provider (admin-configured sentinel provider, or first active)
    let emergencyProviderId = process.env.EMERGENCY_PROVIDER_ID?.trim() || null;
    if (!emergencyProviderId) {
      const firstProvider = await prisma.provider.findFirst({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true },
      });
      if (!firstProvider) {
        return NextResponse.json(
          { error: "No providers available. Please try again later." },
          { status: 503 }
        );
      }
      emergencyProviderId = firstProvider.id;
    }

    // Build symptoms + notes summary stored in deliveryOpt
    const symptomsText = (body.symptoms ?? []).length > 0
      ? `Symptoms: ${(body.symptoms ?? []).join(", ")}`
      : null;
    const notesText = body.notes?.trim() || null;
    const deliveryOpt = [symptomsText, notesText].filter(Boolean).join("\n") || null;

    const result = await prisma.$transaction(
      async (tx) => {
        // ── Patient upsert ──
        let patient = await tx.patient.findUnique({
          where: { phone: meta.canonical },
          select: { id: true, name: true, phone: true },
        });

        if (!patient) {
          try {
            patient = await tx.patient.create({
              data: { name, phone: meta.canonical, consentAt: new Date() },
              select: { id: true, name: true, phone: true },
            });
          } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
              patient = await tx.patient.findUnique({
                where: { phone: meta.canonical },
                select: { id: true, name: true, phone: true },
              });
            } else {
              throw err;
            }
          }
        }

        if (!patient) throw new Error("Unable to create patient profile");

        // ── Create emergency appointment (no slotId) ──
        const appointment = await tx.appointment.create({
          data: {
            patientId: patient.id,
            patientName: name,
            providerId: emergencyProviderId!,
            slotId: null,
            status: "EMERGENCY_PENDING",
            visitMode: body.visitMode === "AUDIO" ? "AUDIO" : "VIDEO",
            feePaise: EMERGENCY_FEE_PAISE,
            feeCurrency: "INR",
            deliveryOpt,
            consentType: "EXPLICIT",
            consentMode: "APP_SCREEN",
            consentText: CANONICAL_CONSENT_TEXT,
            consentAt: new Date(),
          },
          select: { id: true },
        });

        return { appointmentId: appointment.id, patientPhone: patient.phone };
      },
      { maxWait: 10_000, timeout: 15_000 }
    );

    // Fire-and-forget WhatsApp notification to patient
    const baseUrl = appBaseUrl();
    const trackUrl = `${baseUrl}/patient/appointments/${result.appointmentId}`;
    const firstName = name.split(" ")[0];
    const waBody =
      `🚨 Emergency booking received!\n\n` +
      `Hi ${firstName}, your emergency consultation request has been received. A doctor will reach out to you within 5 minutes.\n\n` +
      `Track your appointment:\n${trackUrl}\n\n` +
      `— CalDoc Team`;

    sendWhatsAppText(meta.canonical, waBody).catch((err) =>
      console.error("[emergency] WhatsApp notify failed:", getErrorMessage(err))
    );

    return NextResponse.json({ appointmentId: result.appointmentId, amount: EMERGENCY_FEE_PAISE });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
