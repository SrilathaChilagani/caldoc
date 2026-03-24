import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signPatientMobileToken } from "@/lib/patientMobileToken";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const phone = String(body?.phone || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check for existing patient with same phone or email
    const existing = await prisma.patient.findFirst({
      where: { OR: [{ phone }, { email }] },
      select: { id: true, phone: true, email: true },
    });
    if (existing?.phone === phone) {
      return NextResponse.json({ error: "Phone number already registered. Please sign in." }, { status: 409 });
    }
    if (existing?.email === email) {
      return NextResponse.json({ error: "Email already registered. Please sign in." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const patient = await prisma.patient.create({
      data: { name, phone, email, passwordHash },
      select: { id: true, name: true, phone: true },
    });

    const token = signPatientMobileToken({ patientId: patient.id, phone: patient.phone, name: patient.name });
    return NextResponse.json({ token }, { status: 201 });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
