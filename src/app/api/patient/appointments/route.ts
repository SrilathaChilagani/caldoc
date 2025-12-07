import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPatientMobileToken } from "@/lib/patientMobileToken";
import { getErrorMessage } from "@/lib/errors";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return unauthorized();
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return unauthorized();
    }

    let claims: { patientId: string };
    try {
      const decoded = verifyPatientMobileToken(token);
      claims = { patientId: decoded.patientId };
    } catch {
      return unauthorized();
    }

    const appointments = await prisma.appointment.findMany({
      where: { patientId: claims.patientId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        status: true,
        slot: { select: { startsAt: true } },
        provider: { select: { name: true } },
      },
    });

    return NextResponse.json({
      appointments: appointments.map((appt) => ({
        id: appt.id,
        status: appt.status,
        provider: { name: appt.provider?.name ?? "Doctor" },
        slot: { startsAt: appt.slot?.startsAt },
        createdAt: appt.createdAt,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
