import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { getErrorMessage } from "@/lib/errors";
import { PATIENT_COOKIE, PATIENT_MAX_AGE_DAYS, signPatientSession } from "@/lib/patientAuth.server";

const OTP_TEMPLATE = process.env.WHATSAPP_TEMPLATE_PATIENT_LOGIN || "patient_login_otp";
const OTP_TTL_MINUTES = Number(process.env.PATIENT_OTP_TTL_MINUTES || 5);
const RESEND_WINDOW_SECONDS = Number(process.env.PATIENT_OTP_RESEND_SECONDS || 60);
// Set SKIP_PATIENT_OTP=true in dev/staging to bypass WhatsApp. Default: false (OTP enabled).
const SKIP_OTP = process.env.SKIP_PATIENT_OTP === "true";

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

    if (SKIP_OTP) {
      // Auto-register if first time
      let p = patient;
      if (!p) {
        p = await prisma.patient.create({
          data: { phone: meta.canonical, name: meta.canonical, consentAt: new Date() },
        }).catch(async () =>
          prisma.patient.findUnique({ where: { phone: meta.canonical } })
        ) as typeof patient;
      }
      if (!p) return NextResponse.json({ error: "Unable to create account" }, { status: 500 });
      const token = signPatientSession(p.phone, p.id);
      const jar = await cookies();
      jar.set(PATIENT_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: PATIENT_MAX_AGE_DAYS * 24 * 60 * 60,
        path: "/",
      });
      return NextResponse.json({ ok: true, skip: true, redirect: nextPath });
    }

    const now = new Date();
    const existing = await prisma.patientOtp.findFirst({
      where: { phoneCanonical: meta.canonical },
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
        ...(patient ? { patientId: patient.id } : {}),
        phoneRaw: phoneInput,
        phoneCanonical: meta.canonical,
        last10: meta.last10,
        otpHash,
        expiresAt,
        lastSentAt: now,
      },
    });

    let sentMessageId: string | null = null;

    try {
      const waResult = await sendWhatsAppTemplate({
        to: meta.canonical,
        template: OTP_TEMPLATE,
        vars: [otp, String(OTP_TTL_MINUTES)],
      });
      sentMessageId = waResult?.messageId ?? null;
    } catch (waErr) {
      const errMsg = waErr instanceof Error ? waErr.message : String(waErr);
      console.warn("[OTP] WhatsApp send failed:", errMsg);
      await prisma.outboundMessage.create({
        data: {
          channel: "WHATSAPP",
          kind: "OTP",
          toPhone: meta.canonical,
          template: OTP_TEMPLATE,
          status: "FAILED",
          error: errMsg,
        },
      }).catch(() => {});
      return NextResponse.json(
        { error: "Could not send WhatsApp OTP. Please use the Email tab to sign in instead." },
        { status: 503 }
      );
    }

    await prisma.outboundMessage.create({
      data: {
        channel: "WHATSAPP",
        kind: "OTP",
        toPhone: meta.canonical,
        template: OTP_TEMPLATE,
        status: "SENT",
        messageId: sentMessageId,
      },
    }).catch(() => {});

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
