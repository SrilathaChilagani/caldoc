import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readProviderSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sess = await readProviderSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      providerId: sess.pid,
      slot: { startsAt: { gte: fromDate, lte: toDate } },
    },
    select: {
      id: true,
      patientName: true,
      status: true,
      videoRoom: true,
      visitMode: true,
      patient: { select: { name: true, phone: true } },
      slot: { select: { startsAt: true, endsAt: true } },
    },
    orderBy: { slot: { startsAt: "asc" } },
  });

  return NextResponse.json({
    appointments: appointments
      .filter((a) => a.slot?.startsAt)
      .map((a) => ({
        id: a.id,
        patientName: a.patientName || a.patient?.name || "Patient",
        patientPhone: a.patient?.phone,
        status: a.status,
        videoRoom: a.videoRoom,
        visitMode: a.visitMode,
        startsAt: a.slot!.startsAt.toISOString(),
        endsAt: a.slot!.endsAt.toISOString(),
      })),
  });
}
