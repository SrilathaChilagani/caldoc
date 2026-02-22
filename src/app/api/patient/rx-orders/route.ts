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

    const orders = await prisma.rxOrder.findMany({
      where: { patientId: claims.patientId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        status: true,
        items: true,
        amountPaise: true,
        createdAt: true,
        notes: true,
      },
    });

    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
