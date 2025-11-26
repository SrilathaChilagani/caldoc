import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProviderSession } from "@/lib/auth.server";
import { getErrorMessage } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const provider = await requireProviderSession();
    if (!provider) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { appointmentId?: string };
    const appointmentId = body?.appointmentId;
    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { providerId: true, videoRoom: true },
    });

    if (!appointment || appointment.providerId !== provider.providerId) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    let roomUrl = appointment.videoRoom;
    if (!roomUrl) {
      const origin = req.headers.get("origin") || new URL(req.url).origin;
      roomUrl = `${origin}/room/${appointmentId}`;
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { videoRoom: roomUrl },
      });
    }

    return NextResponse.json({ roomUrl });
  } catch (err) {
    const message = getErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
