import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const START_TIME = "09:00";
const END_TIME = "17:00";
const INTERVAL_MINS = 30;
const DAYS_AHEAD = 3;

function parseDateTimeISO(day: Date, time: string) {
  const isoDate = day.toISOString().slice(0, 10);
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const iso = `${isoDate}T${normalizedTime}`;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

async function createSlotsForProvider(providerId: string, feePaise: number | null) {
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
        if ((err as { code?: string }).code !== "P2002") {
          throw err;
        }
      }
      cursor = next;
    }
  }

  return created;
}

async function main() {
  const providers = await prisma.provider.findMany({ select: { id: true, defaultFeePaise: true, name: true } });
  let total = 0;
  for (const provider of providers) {
    const count = await createSlotsForProvider(provider.id, provider.defaultFeePaise ?? null);
    total += count;
    console.log(`Ensured ${count} slots for ${provider.name}`);
  }
  console.log(`Done. Created ${total} slots across ${providers.length} providers.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
