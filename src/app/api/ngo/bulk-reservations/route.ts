import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireNgoSession } from "@/lib/auth.server";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function makeFriendlyId(providerName: string) {
  const initials = providerName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `NGO-${initials}-${random}`;
}

function appBaseUrl() {
  return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";
}

function formatIST(date: Date) {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function POST(req: NextRequest) {
  const session = await requireNgoSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const slotIds = Array.isArray(body?.slotIds) ? body.slotIds.map((id: unknown) => String(id)) : [];
  if (!slotIds.length) {
    return NextResponse.json({ error: "No slots selected" }, { status: 400 });
  }

  const ngo = await prisma.ngo.findUnique({
    where: { id: session.ngoId },
    select: { name: true, contactPhone: true },
  });

  const slots = await prisma.slot.findMany({
    where: { id: { in: slotIds } },
    include: {
      provider: {
        select: { id: true, name: true, defaultFeePaise: true, speciality: true, phone: true },
      },
    },
  });

  if (slots.length !== slotIds.length) {
    return NextResponse.json({ error: "Some slots are unavailable" }, { status: 400 });
  }

  try {
    const summaries = await prisma.$transaction(
      async (tx) => {
        const updateResult = await tx.slot.updateMany({
          where: { id: { in: slotIds }, isBooked: false },
          data: { isBooked: true },
        });

        if (updateResult.count !== slotIds.length) {
          throw new Error("Some slots were already booked");
        }

        await tx.ngoReservation.createMany({
          data: slots.map((slot) => ({
            ngoId: session.ngoId,
            providerId: slot.providerId,
            slotId: slot.id,
            status: "HELD",
            friendlyId: makeFriendlyId(slot.provider.name || "NGO"),
            amountPaise: slot.feePaise ?? slot.provider.defaultFeePaise ?? null,
            speciality: slot.provider.speciality,
          })),
        });

        const summary: Record<
          string,
          { providerId: string; providerName: string; providerPhone?: string | null; count: number; nextSlot?: Date | null }
        > = {};
        slots.forEach((slot) => {
          const existing = summary[slot.providerId];
          if (!existing) {
            summary[slot.providerId] = {
              providerId: slot.providerId,
              providerName: slot.provider.name || slot.providerId,
              providerPhone: slot.provider.phone,
              count: 1,
              nextSlot: slot.startsAt,
            };
          } else {
            existing.count += 1;
            if (!existing.nextSlot || slot.startsAt < existing.nextSlot) {
              existing.nextSlot = slot.startsAt;
            }
          }
        });
        return summary;
      },
      { timeout: 20_000 },
    );

    sendNgoNotifications({
      ngoName: ngo?.name || "Your NGO",
      ngoPhone: ngo?.contactPhone,
      summaries,
      totalCount: slotIds.length,
    }).catch((err) => {
      console.error("ngo bulk notify error", err);
    });

    return NextResponse.json({ ok: true, summary: summaries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to reserve slots";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

type SummaryMap = Record<
  string,
  { providerId: string; providerName: string; providerPhone?: string | null; count: number; nextSlot?: Date | null }
>;

async function sendNgoNotifications({
  ngoName,
  ngoPhone,
  summaries,
  totalCount,
}: {
  ngoName: string;
  ngoPhone?: string | null;
  summaries: SummaryMap;
  totalCount: number;
}) {
  const baseUrl = appBaseUrl();
  const providerUrl = `${baseUrl}/provider/appointments`;
  const ngoUrl = `${baseUrl}/ngo/appointments`;

  const providerPromises = Object.values(summaries).map((entry) => {
    if (!entry.providerPhone) return Promise.resolve();
    const timeLabel = entry.nextSlot ? ` First slot ${formatIST(entry.nextSlot)}.` : "";
    const body = `Hi ${entry.providerName}, ${ngoName} reserved ${entry.count} NGO slot${
      entry.count > 1 ? "s" : ""
    } via CalDoc.${timeLabel} Review slots: ${providerUrl}`;
    return sendWhatsAppText(entry.providerPhone, body).catch((err) => {
      console.error("bulk provider notify error", err);
    });
  });

  const ngoSummaryText = Object.values(summaries)
    .map((entry) => `${entry.providerName} (${entry.count})`)
    .join(", ");
  if (ngoPhone && totalCount > 0) {
    const ngoBody = `Hi ${ngoName}, you reserved ${totalCount} slot${totalCount > 1 ? "s" : ""}: ${ngoSummaryText}. Track them here: ${ngoUrl}`;
    providerPromises.push(
      sendWhatsAppText(ngoPhone, ngoBody).catch((err) => {
        console.error("bulk ngo notify error", err);
      }),
    );
  }

  await Promise.all(providerPromises);
}
