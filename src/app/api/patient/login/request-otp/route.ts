import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { sendVerificationSms } from "@/lib/twilioVerify";
import { getErrorMessage } from "@/lib/errors";
import { PATIENT_COOKIE, PATIENT_MAX_AGE_DAYS, signPatientSession } from "@/lib/patientAuth.server";

const OTP_TTL_MINUTES = Number(process.env.PATIENT_OTP_TTL_MINUTES || 10);
const RESEND_WINDOW_SECONDS = Number(process.env.PATIENT_OTP_RESEND_SECONDS || 60);
const SKIP_OTP = process.env.SKIP_PATIENT_OTP === "true";

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

    const patient = await prisma.patient.findUnique({ where: { phone: meta.canonical } });

    if (SKIP_OTP) {
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

    // Rate-limit using the most recent send attempt logged in OutboundMessage
    const lastSend = await prisma.outboundMessage.findFirst({
      where: { channel: "SMS", kind: "OTP", toPhone: meta.canonical },
      orderBy: { createdAt: "desc" },
    });
    if (lastSend) {
      const secondsSinceLast = (Date.now() - lastSend.createdAt.getTime()) / 1000;
      if (secondsSinceLast < RESEND_WINDOW_SECONDS) {
        const wait = Math.ceil(RESEND_WINDOW_SECONDS - secondsSinceLast);
        return NextResponse.json(
          { error: `Please wait ${wait}s before requesting another code.` },
          { status: 429 },
        );
      }
    }

    try {
      const result = await sendVerificationSms(meta.canonical);
      await prisma.outboundMessage.create({
        data: {
          channel: "SMS",
          kind: "OTP",
          toPhone: meta.canonical,
          template: "twilio_verify",
          status: "SENT",
          messageId: result.sid,
        },
      }).catch(() => {});
    } catch (twErr) {
      const errMsg = twErr instanceof Error ? twErr.message : String(twErr);
      console.warn("[OTP] Twilio Verify send failed:", errMsg);
      await prisma.outboundMessage.create({
        data: {
          channel: "SMS",
          kind: "OTP",
          toPhone: meta.canonical,
          template: "twilio_verify",
          status: "FAILED",
          error: errMsg,
        },
      }).catch(() => {});
      return NextResponse.json(
        { error: "Could not send SMS OTP. Please try again in a moment." },
        { status: 503 }
      );
    }

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
