import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  if (appointment.status === "CANCELLED" || appointment.status === "CANCELED") {
    return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
  }

  const prevStatus = appointment.status;

  await prisma.$transaction([
    prisma.appointment.update({ where: { id }, data: { status: "CANCELLED" } }),
    prisma.appointmentStatusHistory.create({
      data: {
        appointmentId: id,
        fromStatus: prevStatus,
        toStatus: "CANCELLED",
        actorType: "admin",
        actorId: session.userId,
        reason: "Cancelled by admin",
      },
    }),
    ...(appointment.slotId
      ? [prisma.slot.update({ where: { id: appointment.slotId }, data: { isBooked: false } })]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}
