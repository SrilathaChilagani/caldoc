import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFrontDeskSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sess = await requireFrontDeskSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to   = searchParams.get("to");
  const providerParam = searchParams.get("providers"); // comma-separated IDs, or empty = all

  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });

  const fromDate = new Date(from);
  const toDate   = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }

  const providerIds = providerParam
    ? providerParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const providers = await prisma.provider.findMany({
    where: { isActive: true, ...(providerIds.length ? { id: { in: providerIds } } : {}) },
    select: { id: true, name: true, speciality: true },
    orderBy: { name: "asc" },
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      providerId: { in: providers.map((p) => p.id) },
      slot: { startsAt: { gte: fromDate, lte: toDate } },
    },
    select: {
      id: true,
      providerId: true,
      patientName: true,
      status: true,
      visitMode: true,
      videoRoom: true,
      patient: { select: { name: true } },
      slot: { select: { id: true, startsAt: true, endsAt: true } },
    },
    orderBy: { slot: { startsAt: "asc" } },
  });

  // Free slots for reschedule picker
  const freeSlots = await prisma.slot.findMany({
    where: {
      providerId: { in: providers.map((p) => p.id) },
      isBooked: false,
      startsAt: { gte: new Date(), lte: toDate },
    },
    select: { id: true, providerId: true, startsAt: true, endsAt: true },
    orderBy: { startsAt: "asc" },
    take: 500,
  });

  return NextResponse.json({
    providers: providers.map((p, i) => ({ ...p, colorIndex: i % 8 })),
    appointments: appointments
      .filter((a) => a.slot?.startsAt)
      .map((a) => ({
        id: a.id,
        providerId: a.providerId,
        patientName: a.patientName || a.patient?.name || "Patient",
        status: a.status,
        visitMode: a.visitMode,
        videoRoom: a.videoRoom,
        slotId: a.slot!.id,
        startsAt: a.slot!.startsAt.toISOString(),
        endsAt: a.slot!.endsAt.toISOString(),
      })),
    freeSlots: freeSlots.map((s) => ({
      id: s.id,
      providerId: s.providerId,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
    })),
  });
}
