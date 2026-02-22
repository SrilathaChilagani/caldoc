import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPatientMobileToken } from "@/lib/patientMobileToken";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return unauthorized();
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) return unauthorized();

    let claims: { patientId: string };
    try {
      claims = verifyPatientMobileToken(token);
    } catch {
      return unauthorized();
    }

    const patient = await prisma.patient.findUnique({
      where: { id: claims.patientId },
      select: { id: true, name: true, phone: true, email: true, dob: true },
    });

    if (!patient) return unauthorized();

    return NextResponse.json({ patient });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
