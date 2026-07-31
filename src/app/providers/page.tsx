import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import ProvidersClient from "./ProvidersClient";

// Cache the page for 60 seconds — providers/slots change rarely enough
// that a 1-minute stale window dramatically cuts DB load and TTFB.
export const revalidate = 60;

// Cache specialty list (changes rarely)
const getCachedSpecialties = unstable_cache(
  () =>
    prisma.provider.findMany({
      select: { speciality: true },
      where: { isActive: true },
      distinct: ["speciality"],
      orderBy: { speciality: "asc" },
    }),
  ["provider-specialties"],
  { revalidate: 300 }
);

type FilterKey = {
  city: string;
  specialty: string;
  mode: string;
  q: string;
};

function buildWhere({ city, specialty, mode, q }: FilterKey) {
  const andClauses: object[] = [{ isActive: true }];
  if (specialty) andClauses.push({ speciality: { contains: specialty, mode: "insensitive" } });
  if (q) andClauses.push({ OR: [{ name: { contains: q, mode: "insensitive" } }, { speciality: { contains: q, mode: "insensitive" } }] });
  if (mode === "IN_PERSON") andClauses.push({ clinics: { some: { isActive: true } } });
  if (mode && mode !== "IN_PERSON") andClauses.push({ visitModes: { has: mode } });
  const clinicWhere = city
    ? { isActive: true, city: { contains: city, mode: "insensitive" as const } }
    : { isActive: true };
  if (city && mode === "IN_PERSON") andClauses.push({ clinics: { some: clinicWhere } });
  return { whereClause: { AND: andClauses }, clinicWhere };
}

// Same filter inputs → same cached result for 60s, regardless of URL shape.
const getCachedProvidersList = unstable_cache(
  async (filters: FilterKey) => {
    const { whereClause, clinicWhere } = buildWhere(filters);
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const rows = await prisma.provider.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      take: 12,
      select: {
        id: true, slug: true, name: true, speciality: true, qualification: true,
        languages: true, is24x7: true, defaultFeePaise: true, profilePhotoKey: true, visitModes: true,
        clinics: {
          where: clinicWhere,
          select: { id: true, clinicName: true, addressLine1: true, addressLine2: true, city: true, state: true, pincode: true, lat: true, lng: true, phone: true },
          take: 3,
        },
        slots: {
          where: { isBooked: false, startsAt: { gte: now, lt: windowEnd } },
          orderBy: { startsAt: "asc" },
          select: { id: true, startsAt: true },
          take: 200,
        },
      },
    });
    return {
      rows: rows.map((p) => ({
        ...p,
        slots: p.slots.map((s) => ({ id: s.id, startsAt: s.startsAt.toISOString() })),
      })),
      generatedAt: now.toISOString(),
    };
  },
  ["providers-list-v2"],
  { revalidate: 60 }
);

const getCachedProvidersCount = unstable_cache(
  async (filters: FilterKey) => {
    const { whereClause } = buildWhere(filters);
    return prisma.provider.count({ where: whereClause });
  },
  ["providers-count-v1"],
  { revalidate: 60 }
);

// IST offset
const IST_MS = 5.5 * 60 * 60 * 1000;
function toISTDate(date: Date) {
  return new Date(date.getTime() + IST_MS).toISOString().slice(0, 10);
}

type SearchParamsInput = Promise<Record<string, string | string[] | undefined>>;

export default async function ProvidersPage({ searchParams }: { searchParams?: SearchParamsInput }) {
  const sp = searchParams ? await searchParams : {};
  const city = (sp.city as string | undefined)?.trim() || "Hyderabad";
  const specialty = (sp.specialty as string | undefined)?.trim() || "";
  const mode = (sp.mode as string | undefined)?.trim().toUpperCase() || "";
  const q = (sp.q as string | undefined)?.trim() || "";
  const patientName = (sp.patientName as string | undefined)?.trim() || "";
  const patientPhone = (sp.patientPhone as string | undefined)?.trim() || "";
  const embed = (sp.embed as string | undefined)?.trim() || "";

  const filterKey: FilterKey = { city, specialty, mode, q };

  // 7-day slot window — anchored to the cached generatedAt so all viewers
  // of a given cache entry see the same day buckets.
  const [cached, specialtyList, total] = await Promise.all([
    getCachedProvidersList(filterKey),
    getCachedSpecialties(),
    getCachedProvidersCount(filterKey),
  ]);

  const anchor = new Date(cached.generatedAt);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(toISTDate(new Date(anchor.getTime() + i * 24 * 60 * 60 * 1000)));
  }

  // Build slotsByDay buckets for each provider
  const providers = cached.rows.map((p) => {
    const slotsByDay: Record<string, { id: string; startsAt: string }[]> = {};
    for (const day of days) slotsByDay[day] = [];
    for (const slot of p.slots) {
      const day = toISTDate(new Date(slot.startsAt));
      if (slotsByDay[day]) slotsByDay[day].push({ id: slot.id, startsAt: slot.startsAt });
    }
    return { ...p, slotsByDay, days };
  });

  const specialtyOptions = specialtyList
    .map((s) => s.speciality)
    .filter((s): s is string => Boolean(s));

  return (
    <ProvidersClient
      initialProviders={providers}
      initialTotal={total}
      initialCity={city}
      initialSpecialty={specialty}
      initialMode={mode}
      initialQ={q}
      specialtyOptions={specialtyOptions}
      patientName={patientName}
      patientPhone={patientPhone}
      embed={embed}
    />
  );
}
