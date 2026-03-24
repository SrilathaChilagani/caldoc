import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signPatientMobileToken } from "@/lib/patientMobileToken";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { email },
      select: { id: true, name: true, phone: true, passwordHash: true },
    });

    if (!patient?.passwordHash) {
      return NextResponse.json({ error: "No account found with this email. Please sign up." }, { status: 401 });
    }

    const match = await bcrypt.compare(password, patient.passwordHash);
    if (!match) {
      return NextResponse.json({ error: "Incorrect password. Please try again." }, { status: 401 });
    }

    const token = signPatientMobileToken({ patientId: patient.id, phone: patient.phone, name: patient.name });
    return NextResponse.json({ token });
  } catch (err) {
    console.error("[login/email]", err);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
