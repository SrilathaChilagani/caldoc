import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

const START_TIME = "09:00";
const END_TIME = "17:00";
const INTERVAL_MINS = 30;
const DAYS_AHEAD = 30;

function parseDateTimeISO(day: Date, time: string): Date | null {
  const isoDate = day.toISOString().slice(0, 10);
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const dt = new Date(`${isoDate}T${normalizedTime}`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

async function createSlotsForProvider(
  providerId: string,
  feePaise: number | null
): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let created = 0;

  for (let i = 0; i < DAYS_AHEAD; i += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    const startDate = parseDateTimeISO(day, START_TIME);
    const endDate = parseDateTimeISO(day, END_TIME);
    if (!startDate || !endDate || !(startDate < endDate)) continue;

    let cursor = new Date(startDate);
    while (cursor < endDate) {
      const next = new Date(cursor.getTime() + INTERVAL_MINS * 60 * 1000);
      if (next > endDate) break;
      try {
        await prisma.slot.create({
          data: {
            providerId,
            startsAt: new Date(cursor),
            endsAt: next,
            feePaise: feePaise ?? undefined,
          },
        });
        created += 1;
      } catch (err) {
        // P2002 = unique constraint — slot already exists, skip
        if ((err as { code?: string }).code !== "P2002") throw err;
      }
      cursor = next;
    }
  }

  return created;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const providers = await prisma.provider.findMany({
      select: { id: true, defaultFeePaise: true, name: true },
    });

    let total = 0;
    for (const provider of providers) {
      const count = await createSlotsForProvider(
        provider.id,
        provider.defaultFeePaise ?? null
      );
      total += count;
    }

    return NextResponse.json({
      ok: true,
      created: total,
      providers: providers.length,
      daysAhead: DAYS_AHEAD,
      at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
