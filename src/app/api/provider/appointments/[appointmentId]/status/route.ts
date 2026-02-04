import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProviderSession } from "@/lib/auth.server";
import { sendPatientUploadLink } from "@/lib/sendPatientUploadLink";
import {
  ensureVideoRoomIfNeeded,
  notifyVideoLinks,
  sendPatientVideoConfirmation,
} from "@/lib/videoLinkHelpers";

type RouteContext = {
  params: Promise<{ appointmentId: string }>;
};

function appBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const session = await requireProviderSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appointmentId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const action = String(body?.action || "").toUpperCase();

  if (!appointmentId || !action) {
    return NextResponse.json(
      { error: "Missing appointmentId or action" },
      { status: 400 }
    );
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      provider: true,
      slot: { select: { startsAt: true } },
    },
  });

  if (!appointment || appointment.providerId !== session.providerId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  switch (action) {
    case "CONFIRM": {
      if (appointment.status === "CONFIRMED") {
        const baseUrl = appBaseUrl();
        await sendPatientUploadLink(appointment, baseUrl);
        const link = await ensureVideoRoomIfNeeded(
          appointment.id,
          {
            visitMode: appointment.visitMode,
            videoRoom: appointment.videoRoom,
            slotStartsAt: appointment.slot?.startsAt ?? null,
            forceImmediate: true,
          },
          baseUrl,
        );
        await sendPatientVideoConfirmation(appointment, link || appointment.videoRoom);
        await notifyVideoLinks(appointment, link || appointment.videoRoom, { notifyPatient: false });
        return NextResponse.json({ ok: true, status: "CONFIRMED" });
      }

      const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "CONFIRMED",
          statusHistory: {
            create: {
              fromStatus: appointment.status,
              toStatus: "CONFIRMED",
              actorType: "PROVIDER",
              actorId: session.userId,
            },
          },
        },
        include: {
          patient: true,
          provider: true,
          slot: { select: { startsAt: true } },
        },
      });

      const baseUrl = appBaseUrl();
      await sendPatientUploadLink(updated, baseUrl);
      const link = await ensureVideoRoomIfNeeded(
        updated.id,
        {
          visitMode: updated.visitMode,
          videoRoom: updated.videoRoom,
          slotStartsAt: updated.slot?.startsAt ?? null,
          forceImmediate: true,
        },
        baseUrl,
      );
      await sendPatientVideoConfirmation(updated, link || updated.videoRoom);
      await notifyVideoLinks(updated, link || updated.videoRoom, { notifyPatient: false });
      return NextResponse.json({ ok: true, status: "CONFIRMED" });
    }
    case "CANCEL": {
      if (appointment.status === "CANCELLED") {
        return NextResponse.json({ ok: true, status: "CANCELLED" });
      }

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "CANCELLED",
          statusHistory: {
            create: {
              fromStatus: appointment.status,
              toStatus: "CANCELLED",
              actorType: "PROVIDER",
              actorId: session.userId,
            },
          },
        },
      });
      return NextResponse.json({ ok: true, status: "CANCELLED" });
    }
    case "NO_SHOW": {
      if (appointment.status === "NO_SHOW") {
        return NextResponse.json({ ok: true, status: "NO_SHOW" });
      }

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "NO_SHOW",
          statusHistory: {
            create: {
              fromStatus: appointment.status,
              toStatus: "NO_SHOW",
              actorType: "PROVIDER",
              actorId: session.userId,
            },
          },
        },
      });
      return NextResponse.json({ ok: true, status: "NO_SHOW" });
    }
    case "RESCHEDULE": {
      const slotId = String(body?.slotId || "");
      if (!slotId) {
        return NextResponse.json({ error: "slotId is required" }, { status: 400 });
      }

      try {
        await prisma.$transaction(async (tx) => {
          const targetSlot = await tx.slot.findUnique({ where: { id: slotId } });
          if (!targetSlot || targetSlot.providerId !== appointment.providerId) {
            throw new Error("Slot not available");
          }
          if (targetSlot.isBooked) {
            throw new Error("Selected slot already booked");
          }

          if (appointment.slotId && appointment.slotId !== slotId) {
            await tx.slot.update({
              where: { id: appointment.slotId },
              data: { isBooked: false },
            });
          }

          await tx.slot.update({
            where: { id: slotId },
            data: { isBooked: true },
          });

          await tx.appointment.update({
            where: { id: appointmentId },
            data: {
              slotId,
              status: "RESCHEDULED",
              statusHistory: {
                create: {
                  fromStatus: appointment.status,
                  toStatus: "RESCHEDULED",
                  actorType: "PROVIDER",
                  actorId: session.userId,
                  reason: body?.reason || null,
                },
              },
            },
          });
        });
      } catch (err) {
        return NextResponse.json(
          { error: (err as Error).message || "Unable to reschedule" },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: true, status: "RESCHEDULED" });
    }
    default:
      return NextResponse.json(
        { error: "Unsupported action" },
        { status: 400 }
      );
  }
}
