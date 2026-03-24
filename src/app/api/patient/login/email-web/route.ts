import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { PATIENT_COOKIE, signPatientSession } from "@/lib/patientAuth.server";

const MAX_AGE_DAYS = 365;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const next = String(body?.next || "/patient/appointments");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { email },
      select: { id: true, phone: true, passwordHash: true },
    });

    if (!patient?.passwordHash) {
      return NextResponse.json({ error: "No account found with this email. Please sign up." }, { status: 401 });
    }

    const match = await bcrypt.compare(password, patient.passwordHash);
    if (!match) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    const token = signPatientSession(patient.phone, patient.id);
    const jar = await cookies();
    jar.set(PATIENT_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.json({ ok: true, redirect: next });
  } catch (err) {
    console.error("[login/email-web]", err);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
