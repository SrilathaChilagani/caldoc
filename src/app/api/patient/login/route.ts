import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { checkVerificationCode } from "@/lib/twilioVerify";
import { getErrorMessage } from "@/lib/errors";
import { signPatientMobileToken } from "@/lib/patientMobileToken";

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

    let patient = await prisma.patient.findUnique({ where: { phone: meta.canonical } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    if (!SKIP_OTP) {
      try {
        const result = await checkVerificationCode(meta.canonical, codeInput);
        if (!result.valid) {
          return NextResponse.json({ error: "Incorrect or expired code" }, { status: 401 });
        }
      } catch (twErr) {
        const errMsg = twErr instanceof Error ? twErr.message : String(twErr);
        console.warn("[OTP] Twilio Verify check failed:", errMsg);
        return NextResponse.json({ error: "Could not verify code. Request a new one." }, { status: 400 });
      }
    }

    const token = signPatientMobileToken({ patientId: patient.id, phone: patient.phone, name: patient.name });
    return NextResponse.json({ token });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
