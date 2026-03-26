import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { PATIENT_COOKIE, signPatientSession } from "@/lib/patientAuth.server";

const MAX_AGE_DAYS = 365;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const phone = String(body?.phone || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const dobRaw = String(body?.dob || "").trim();
    const sex = String(body?.sex || "").trim() || null;
    const next = String(body?.next || "/patient/appointments");
    const dob = dobRaw ? new Date(dobRaw) : null;

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const phoneMeta = buildPatientPhoneMeta(phone);
    if (!phoneMeta) {
      return NextResponse.json({ error: "Enter a valid phone number with country code (e.g. +91 98765 43210)" }, { status: 400 });
    }

    const existing = await prisma.patient.findFirst({
      where: { OR: [{ phone: phoneMeta.canonical }, { email }] },
      select: { phone: true, email: true },
    });
    if (existing?.phone === phoneMeta.canonical) {
      return NextResponse.json({ error: "Phone number already registered. Please sign in." }, { status: 409 });
    }
    if (existing?.email === email) {
      return NextResponse.json({ error: "Email already registered. Please sign in." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const patient = await prisma.patient.create({
      data: { name, phone: phoneMeta.canonical, email, passwordHash, dob, sex, consentAt: new Date() },
      select: { id: true, phone: true },
    });

    const token = signPatientSession(patient.phone, patient.id);
    const jar = await cookies();
    jar.set(PATIENT_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.json({ ok: true, redirect: next }, { status: 201 });
  } catch (err) {
    console.error("[register-web]", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
