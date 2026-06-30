import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

const START_TIME    = "09:00";
const END_TIME      = "17:00";
const INTERVAL_MINS = 30;
const DAYS_AHEAD    = 30;

// IST = UTC+5:30 — no DST, so this offset is constant year-round
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** Returns the YYYY-MM-DD calendar date in IST for a given UTC instant. */
function istDateString(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Parses a wall-clock time on an IST calendar date into a UTC Date.
 * The explicit +05:30 suffix means the Vercel runtime's local timezone
 * (always UTC) has no effect on the result.
 */
function makeISTTime(istDate: string, hhmm: string): Date | null {
  const dt = new Date(`${istDate}T${hhmm}:00+05:30`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

async function createSlotsForProvider(
  providerId: string,
  feePaise: number | null
): Promise<number> {
  const now = new Date();
  // Midnight IST today, expressed as a UTC instant
  const todayISTStr = istDateString(now);
  const istMidnight = new Date(`${todayISTStr}T00:00:00+05:30`);
  let created = 0;

  for (let i = 0; i < DAYS_AHEAD; i += 1) {
    // IST has no DST → adding exactly 24 h always advances the IST calendar date by 1
    const dayUTC  = new Date(istMidnight.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = istDateString(dayUTC);

    const startDate = makeISTTime(dateStr, START_TIME);
    const endDate   = makeISTTime(dateStr, END_TIME);
    if (!startDate || !endDate || startDate >= endDate) continue;

    let cursor = new Date(startDate);
    while (cursor < endDate) {
      const next = new Date(cursor.getTime() + INTERVAL_MINS * 60 * 1000);
      if (next > endDate) break;
      try {
        await prisma.slot.create({
          data: {
            providerId,
            startsAt: new Date(cursor),
            endsAt:   next,
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
