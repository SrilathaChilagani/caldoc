import { NextRequest, NextResponse } from "next/server";
import type { ProviderScheduleTemplate } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { requireCronAuth } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

// Fallback schedule used only when a provider has no ProviderScheduleTemplate rows.
const FALLBACK_START    = "09:00";
const FALLBACK_END      = "17:00";
const FALLBACK_INTERVAL = 30;

const DAYS_AHEAD = 30;

// IST = UTC+5:30 — no DST, so this offset is constant year-round
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function istDateString(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function makeISTTime(istDate: string, hhmm: string): Date | null {
  const dt = new Date(`${istDate}T${hhmm}:00+05:30`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

type Window = { startHHMM: string; endHHMM: string; intervalMins: number };

/**
 * Returns the time windows to generate slots for on a given IST calendar date.
 * Uses the provider's ProviderScheduleTemplate records if any match, otherwise
 * falls back to the hardcoded defaults so existing providers without templates
 * continue to get slots.
 */
function windowsForDay(
  templates: ProviderScheduleTemplate[],
  dateStr: string,
  dayOfWeek: number,
): Window[] {
  // Midnight IST for this date (used for effectiveFrom/effectiveTo comparison)
  const dateStart = new Date(`${dateStr}T00:00:00+05:30`);

  const matching = templates.filter((t) => {
    if (t.dayOfWeek !== dayOfWeek || !t.isActive) return false;
    if (t.effectiveFrom && dateStart < t.effectiveFrom) return false;
    if (t.effectiveTo && dateStart > t.effectiveTo) return false;
    return true;
  });

  if (matching.length > 0) {
    return matching.map((t) => ({
      startHHMM: `${pad(t.startHour)}:${pad(t.startMinute)}`,
      endHHMM: `${pad(t.endHour)}:${pad(t.endMinute)}`,
      intervalMins: t.slotDurationMinutes,
    }));
  }

  // No templates configured for this day → apply hardcoded defaults.
  // This covers providers that existed before ProviderScheduleTemplate was added.
  return [{ startHHMM: FALLBACK_START, endHHMM: FALLBACK_END, intervalMins: FALLBACK_INTERVAL }];
}

async function createSlotsForProvider(
  providerId: string,
  feePaise: number | null,
  templates: ProviderScheduleTemplate[],
): Promise<number> {
  const now = new Date();
  const todayISTStr = istDateString(now);
  const istMidnight = new Date(`${todayISTStr}T00:00:00+05:30`);

  type SlotInput = { providerId: string; startsAt: Date; endsAt: Date; feePaise?: number };
  const batch: SlotInput[] = [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const dayUTC  = new Date(istMidnight.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = istDateString(dayUTC);
    // Use noon IST to avoid midnight boundary issues when deriving day-of-week
    const dayOfWeek = new Date(`${dateStr}T12:00:00+05:30`).getUTCDay();

    for (const w of windowsForDay(templates, dateStr, dayOfWeek)) {
      const startDate = makeISTTime(dateStr, w.startHHMM);
      const endDate   = makeISTTime(dateStr, w.endHHMM);
      if (!startDate || !endDate || startDate >= endDate) continue;

      let cursor = startDate;
      while (cursor < endDate) {
        const next = new Date(cursor.getTime() + w.intervalMins * 60 * 1000);
        if (next > endDate) break;
        const entry: SlotInput = { providerId, startsAt: new Date(cursor), endsAt: next };
        if (feePaise != null) entry.feePaise = feePaise;
        batch.push(entry);
        cursor = next;
      }
    }
  }

  if (batch.length === 0) return 0;

  const result = await prisma.slot.createMany({ data: batch, skipDuplicates: true });
  return result.count;
}

export async function GET(req: NextRequest) {
  const authError = requireCronAuth(req);
  if (authError) return authError;

  try {
    const providers = await prisma.provider.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        defaultFeePaise: true,
        scheduleTemplates: {
          where: { isActive: true },
        },
      },
    });

    let total = 0;
    for (const provider of providers) {
      const count = await createSlotsForProvider(
        provider.id,
        provider.defaultFeePaise ?? null,
        provider.scheduleTemplates,
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
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}
