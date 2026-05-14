import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { checkVerificationCode } from "@/lib/twilioVerify";
import { PATIENT_COOKIE, PATIENT_MAX_AGE_DAYS, signPatientSession } from "@/lib/patientAuth.server";
import { getErrorMessage } from "@/lib/errors";

const PATIENT_REDIRECT = "/patient/appointments";
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

    if (!SKIP_OTP) {
      try {
        const result = await checkVerificationCode(meta.canonical, code);
        if (!result.valid) {
          return NextResponse.json({ error: "Incorrect or expired code" }, { status: 401 });
        }
      } catch (twErr) {
        const errMsg = twErr instanceof Error ? twErr.message : String(twErr);
        console.warn("[OTP] Twilio Verify check failed:", errMsg);
        return NextResponse.json({ error: "Could not verify code. Request a new one." }, { status: 400 });
      }
    }

    let patient = await prisma.patient.findUnique({ where: { phone: meta.canonical } });
    if (!patient) {
      try {
        patient = await prisma.patient.create({
          data: { phone: meta.canonical, name: meta.canonical, consentAt: new Date() },
        });
      } catch {
        patient = await prisma.patient.findUnique({ where: { phone: meta.canonical } });
      }
    }
    if (!patient) {
      return NextResponse.json({ error: "Unable to create account. Please try again." }, { status: 500 });
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
