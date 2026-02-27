import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { getErrorMessage } from "@/lib/errors";
import { signPatientMobileToken } from "@/lib/patientMobileToken";

const OTP_MAX_ATTEMPTS = Number(process.env.PATIENT_OTP_MAX_ATTEMPTS || 5);
const SKIP_OTP = process.env.SKIP_PATIENT_OTP === "true";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { phone?: string; otp?: string; code?: string };
    const phoneInput = String(body?.phone || "").trim();
    const codeInput = String(body?.otp || body?.code || "").trim();

    if (!phoneInput) {
      return NextResponse.json({ error: "Enter your phone number" }, { status: 400 });
    }
    if (!SKIP_OTP && !codeInput) {
      return NextResponse.json({ error: "Enter the OTP sent to your phone" }, { status: 400 });
    }

    const meta = buildPatientPhoneMeta(phoneInput);
    if (!meta) {
      return NextResponse.json({ error: "Invalid mobile number" }, { status: 400 });
    }

    let patient = await prisma.patient.findUnique({
      where: { phone: meta.canonical },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    if (!SKIP_OTP) {
      const otpRecord = await prisma.patientOtp.findFirst({
        where: { phoneCanonical: meta.canonical },
        orderBy: { createdAt: "desc" },
      });

      if (!otpRecord) {
        return NextResponse.json({ error: "Request a new code" }, { status: 404 });
      }

      if (otpRecord.usedAt) {
        return NextResponse.json({ error: "Code already used" }, { status: 400 });
      }

      if (otpRecord.expiresAt < new Date()) {
        return NextResponse.json({ error: "Code expired" }, { status: 400 });
      }

      if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
        return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
      }

      const match = await bcrypt.compare(codeInput, otpRecord.otpHash);
      if (!match) {
        await prisma.patientOtp.update({
          where: { id: otpRecord.id },
          data: { attempts: { increment: 1 } },
        });
        return NextResponse.json({ error: "Incorrect code" }, { status: 401 });
      }

      if (otpRecord.patientId) {
        patient = await prisma.patient.findUnique({ where: { id: otpRecord.patientId } }) || patient;
      }

      await prisma.patientOtp.update({
        where: { id: otpRecord.id },
        data: { usedAt: new Date() },
      });
    }

    const token = signPatientMobileToken({ patientId: patient.id, phone: patient.phone, name: patient.name });
    return NextResponse.json({ token });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
