import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProviderSession } from "@/lib/auth.server";
import { sendPatientUploadLink } from "@/lib/sendPatientUploadLink";
import {
  ensureVideoRoomIfNeeded,
  notifyVideoLinks,
  sendPatientVideoConfirmation,
} from "@/lib/videoLinkHelpers";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { logAudit } from "@/lib/audit";

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
      prescription: { select: { id: true } },
      labOrders: { select: { id: true, tests: true, status: true } },
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
      logAudit({ action: "APPOINTMENT_CONFIRMED", actorType: "PROVIDER", actorId: session.userId, meta: { appointmentId } }).catch(() => {});
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
      logAudit({ action: "APPOINTMENT_CANCELLED", actorType: "PROVIDER", actorId: session.userId, meta: { appointmentId } }).catch(() => {});
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
      logAudit({ action: "APPOINTMENT_NO_SHOW", actorType: "PROVIDER", actorId: session.userId, meta: { appointmentId } }).catch(() => {});
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
      logAudit({ action: "APPOINTMENT_RESCHEDULED", actorType: "PROVIDER", actorId: session.userId, meta: { appointmentId, slotId } }).catch(() => {});
      return NextResponse.json({ ok: true, status: "RESCHEDULED" });
    }
    case "COMPLETE": {
      if (appointment.status === "COMPLETED") {
        return NextResponse.json({ ok: true, status: "COMPLETED" });
      }

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "COMPLETED",
          statusHistory: {
            create: {
              fromStatus: appointment.status,
              toStatus: "COMPLETED",
              actorType: "PROVIDER",
              actorId: session.userId,
            },
          },
        },
      });

      // Post-consult WhatsApp to patient
      const patientPhone = appointment.patient?.phone;
      if (patientPhone) {
        const baseUrl = appBaseUrl();
        const docName = appointment.provider?.name || "your doctor";
        const providerSlug = appointment.provider?.slug || appointment.provider?.id;
        const hasPrescription = !!appointment.prescription;
        const labOrderCount = appointment.labOrders?.length ?? 0;
        const normalizeTests = (tests: unknown): string => {
          if (!Array.isArray(tests)) return "";
          return tests
            .map((t) => String((t as { name?: string })?.name || t || "").trim())
            .filter(Boolean)
            .join(", ");
        };

        let msg = `Hi${appointment.patient?.name ? " " + appointment.patient.name : ""}! Your consultation with ${docName} is complete.\n\n`;

        if (hasPrescription) {
          msg += `💊 Your prescription is ready. Order your medicines at: ${baseUrl}/services/rx-delivery?appointmentId=${appointmentId}\n\n`;
        }
        if (labOrderCount > 0) {
          const testNames = appointment.labOrders
            .map((o) => normalizeTests(o.tests))
            .filter(Boolean)
            .join(", ");
          msg += `🔬 Lab test${labOrderCount > 1 ? "s" : ""} ordered${testNames ? ": " + testNames : ""}. View & pay at: ${baseUrl}/patient/labs\n\n`;
        }
        if (providerSlug) {
          msg += `📅 Need a follow-up? Book with ${docName}: ${baseUrl}/book/${encodeURIComponent(providerSlug)}`;
        }

        sendWhatsAppText(patientPhone, msg.trim()).catch((e) =>
          console.error("post-consult patient WA", e),
        );
      }
      logAudit({ action: "APPOINTMENT_COMPLETED", actorType: "PROVIDER", actorId: session.userId, meta: { appointmentId } }).catch(() => {});
      return NextResponse.json({ ok: true, status: "COMPLETED" });
    }
    default:
      return NextResponse.json(
        { error: "Unsupported action" },
        { status: 400 }
      );
  }
}
