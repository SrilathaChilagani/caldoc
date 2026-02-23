import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { getErrorMessage } from "@/lib/errors";
import { PATIENT_COOKIE, PATIENT_MAX_AGE_DAYS } from "@/lib/patientAuth.server";

const OTP_TEMPLATE = process.env.WHATSAPP_TEMPLATE_PATIENT_LOGIN || "patient_login_otp";
const OTP_TTL_MINUTES = Number(process.env.PATIENT_OTP_TTL_MINUTES || 5);
const RESEND_WINDOW_SECONDS = Number(process.env.PATIENT_OTP_RESEND_SECONDS || 60);
const SKIP_OTP = process.env.SKIP_PATIENT_OTP !== "false";

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { phone?: string; next?: string };
    const phoneInput = String(body?.phone || "").trim();
    const nextPath = body?.next && body.next.startsWith("/") ? body.next : "/patient/appointments";
    if (!phoneInput) {
      return NextResponse.json({ error: "Enter your mobile number" }, { status: 400 });
    }
    const meta = buildPatientPhoneMeta(phoneInput);
    if (!meta) {
      return NextResponse.json({ error: "Enter a valid phone number with country code (e.g. +91 for India, +1 for US)" }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { phone: meta.canonical },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "We couldn't find an account for that number." },
        { status: 404 },
      );
    }

    if (SKIP_OTP) {
      const jar = await cookies();
      jar.set(PATIENT_COOKIE, patient.phone, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: PATIENT_MAX_AGE_DAYS * 24 * 60 * 60,
        path: "/",
      });
      return NextResponse.json({ ok: true, skip: true, redirect: nextPath });
    }

    const now = new Date();
    const existing = await prisma.patientOtp.findFirst({
      where: { phoneCanonical: patient.phone },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      const secondsSinceLast = (now.getTime() - existing.lastSentAt.getTime()) / 1000;
      if (secondsSinceLast < RESEND_WINDOW_SECONDS) {
        const wait = Math.ceil(RESEND_WINDOW_SECONDS - secondsSinceLast);
        return NextResponse.json(
          { error: `Please wait ${wait}s before requesting another code.` },
          { status: 429 },
        );
      }
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);

    await prisma.patientOtp.create({
      data: {
        patientId: patient.id,
        phoneRaw: phoneInput,
        phoneCanonical: patient.phone,
        last10: meta.last10,
        otpHash,
        expiresAt,
        lastSentAt: now,
      },
    });

    await sendWhatsAppTemplate({
      to: patient.phone,
      template: OTP_TEMPLATE,
      vars: [otp, String(OTP_TTL_MINUTES)],
    });

    return NextResponse.json({
      ok: true,
      masked: meta.masked,
      ttlMinutes: OTP_TTL_MINUTES,
      cooldown: RESEND_WINDOW_SECONDS,
    });
  } catch (err) {
    const message = getErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
