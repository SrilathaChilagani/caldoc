import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { PATIENT_COOKIE, PATIENT_MAX_AGE_DAYS, signPatientSession } from "@/lib/patientAuth.server";
import { getErrorMessage } from "@/lib/errors";

const OTP_MAX_ATTEMPTS = Number(process.env.PATIENT_OTP_MAX_ATTEMPTS || 5);
const PATIENT_REDIRECT = "/patient/appointments";
// Set SKIP_PATIENT_OTP=true in dev/staging to bypass WhatsApp. Default: false (OTP enabled).
const SKIP_OTP = process.env.SKIP_PATIENT_OTP === "true";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { phone?: string; code?: string; next?: string };
    const phoneInput = String(body?.phone || "").trim();
    const code = String(body?.code || "").trim();
    const next = body?.next && body.next.startsWith("/") ? body.next : PATIENT_REDIRECT;

    if (!phoneInput || (!code && !SKIP_OTP)) {
      return NextResponse.json({ error: "Enter your phone number and OTP" }, { status: 400 });
    }

    const meta = buildPatientPhoneMeta(phoneInput);
    if (!meta) {
      return NextResponse.json({ error: "Enter a valid phone number with country code (e.g. +91 for India, +1 for US)" }, { status: 400 });
    }

    let patient = await prisma.patient.findUnique({
      where: { phone: meta.canonical },
    });

    // Auto-register: create a patient record on first login
    if (!patient) {
      try {
        patient = await prisma.patient.create({
          data: {
            phone: meta.canonical,
            name: meta.canonical, // patient can update name in profile
            consentAt: new Date(),
          },
        });
      } catch {
        // Race condition — another request may have created the record
        patient = await prisma.patient.findUnique({ where: { phone: meta.canonical } });
      }
    }

    if (!patient) {
      return NextResponse.json({ error: "Unable to create account. Please try again." }, { status: 500 });
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

      const match = await bcrypt.compare(code, otpRecord.otpHash);
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

    const token = signPatientSession(patient.phone, patient.id);
    const jar = await cookies();
    jar.set(PATIENT_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: PATIENT_MAX_AGE_DAYS * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.json({ ok: true, redirect: next });
  } catch (err) {
    const message = getErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
