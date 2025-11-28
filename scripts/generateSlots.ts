// scripts/generateSlots.ts
import { PrismaClient, Prisma } from "@prisma/client";
import { zonedTimeToUtc } from "date-fns-tz";

const prisma = new PrismaClient();
const DEFAULT_FEE_PAISE = 49900;
const providerFeeSelect = {
  id: true,
  defaultFeePaise: true,
} as const satisfies Prisma.ProviderSelect;
type ProviderWithFee = Prisma.ProviderGetPayload<{ select: typeof providerFeeSelect }>;

/**
 * Generate slots in IST (Asia/Kolkata) then store as UTC.
 * - days: how many future days
 * - startHour/endHour: clinic window in 24h clock IST
 * - slotMinutes: slot length in minutes
 * - weekdays: which weekdays to include (0=Sun .. 6=Sat). Default: Mon–Sat.
 */
type GenOpts = {
  days: number;
  startHour: number;
  endHour: number;      // exclusive (e.g., 9..17 makes 9–5)
  slotMinutes: number;
  weekdays?: number[];
  providerIds?: string[]; // if omitted, do all providers
  feePaise?: number;
};

async function main() {
  const feePaiseFromEnv = parseFeeFromEnv();
  const opts: GenOpts = {
    days: parseInt(process.env.SLOT_DAYS ?? "14", 10),
    startHour: parseInt(process.env.SLOT_START_HOUR ?? "9", 10),
    endHour: parseInt(process.env.SLOT_END_HOUR ?? "17", 10),
    slotMinutes: parseInt(process.env.SLOT_MINUTES ?? "30", 10),
    // Mon–Sat by default
    weekdays: (process.env.SLOT_WEEKDAYS ?? "1,2,3,4,5,6")
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n)),
    providerIds: process.env.SLOT_PROVIDER_IDS
      ? process.env.SLOT_PROVIDER_IDS.split(",").map((s) => s.trim())
      : undefined,
    feePaise: feePaiseFromEnv,
  };

  // 1) Pick providers
  const providers: ProviderWithFee[] = opts.providerIds
    ? await prisma.provider.findMany({
        where: { id: { in: opts.providerIds } },
        select: providerFeeSelect,
      })
    : await prisma.provider.findMany({
        select: providerFeeSelect,
      });

  if (!providers.length) {
    console.log("No providers found. Nothing to do.");
    return;
  }

  const IST = "Asia/Kolkata";
  const created: { providerId: string; startsAt: Date; endsAt: Date; feePaise: number }[] = [];

  // 2) Generate per day, per provider
  const now = new Date();
  for (let d = 0; d < opts.days; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);

    const weekday = day.getDay(); // 0..6
    if (opts.weekdays && !opts.weekdays.includes(weekday)) continue;

    for (const p of providers) {
      const slotFee = opts.feePaise ?? p.defaultFeePaise ?? DEFAULT_FEE_PAISE;
      // Build time slots in IST for this calendar day
      // Start from [year, month, date, startHour:00 IST]
      for (let hour = opts.startHour; hour < opts.endHour; hour++) {
        for (let minute = 0; minute < 60; minute += opts.slotMinutes) {
          const istDateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(
            day.getDate()
          ).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

          // Convert that IST local time → UTC for storage
          const startsAtUtc = zonedTimeToUtc(istDateStr, IST);
          const endsAtUtc = new Date(startsAtUtc.getTime() + opts.slotMinutes * 60 * 1000);

          created.push({ providerId: p.id, startsAt: startsAtUtc, endsAt: endsAtUtc, feePaise: slotFee });
        }
      }
    }
  }

  // 3) Insert but avoid duplicates
  // Best: have a unique constraint on (providerId, startsAt). See note below.
  let inserted = 0;
  for (const chunk of chunkArray(created, 500)) {
    try {
      const res = await prisma.slot.createMany({
        data: chunk.map((c) => ({
          providerId: c.providerId,
          startsAt: c.startsAt,
          endsAt: c.endsAt,
          isBooked: false,
          feePaise: c.feePaise,
        })),
        skipDuplicates: true, // requires a unique index (see note)
      });
      inserted += res.count;
    } catch {
      // Fallback: if no unique index exists, do manual dedupe insert
      for (const c of chunk) {
        const exists = await prisma.slot.findFirst({
          where: { providerId: c.providerId, startsAt: c.startsAt },
          select: { id: true },
        });
        if (!exists) {
          await prisma.slot.create({
            data: {
              providerId: c.providerId,
              startsAt: c.startsAt,
              endsAt: c.endsAt,
              isBooked: false,
              feePaise: c.feePaise,
            },
          });
          inserted++;
        }
      }
    }
  }

  console.log(`✅ Generated ${inserted} new slots over ${providers.length} provider(s).`);
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function parseFeeFromEnv(): number | undefined {
  const explicitPaise = process.env.SLOT_FEE_PAISE;
  if (explicitPaise) {
    const parsed = parseInt(explicitPaise, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  const rupees = process.env.SLOT_FEE_RUPEES;
  if (rupees) {
    const parsed = Number(rupees);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return Math.round(parsed * 100);
    }
  }
  return undefined;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
