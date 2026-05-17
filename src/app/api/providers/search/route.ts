import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";

// IST offset in ms
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toISTDate(date: Date): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return ist.toISOString().slice(0, 10); // YYYY-MM-DD
}

type SearchKey = {
  city: string;
  specialty: string;
  mode: string;
  q: string;
  language: string;
  is24x7: boolean;
  page: number;
  pageSize: number;
};

// Same filter inputs → same cached result for 60s. Mirrors the 60s
// revalidate window the /providers page itself uses, so filter changes
// hit the DB at most once per minute per distinct filter combination.
const getCachedSearch = unstable_cache(
  async (k: SearchKey) => {
    const andClauses: object[] = [{ isActive: true }];

    if (k.specialty) {
      andClauses.push({ speciality: { contains: k.specialty, mode: "insensitive" } });
    }
    if (k.q) {
      andClauses.push({
        OR: [
          { name: { contains: k.q, mode: "insensitive" } },
          { speciality: { contains: k.q, mode: "insensitive" } },
        ],
      });
    }
    if (k.mode === "IN_PERSON") {
      andClauses.push({ clinics: { some: { isActive: true } } });
    }
    if (k.mode && k.mode !== "IN_PERSON") {
      andClauses.push({ visitModes: { has: k.mode } });
    }
    if (k.language) {
      andClauses.push({ languages: { has: k.language } });
    }
    if (k.is24x7) {
      andClauses.push({ is24x7: true });
    }

    // Clinic sub-query: only filter by city for the clinic addresses we show on cards/map.
    const clinicWhere = k.city
      ? { isActive: true, city: { contains: k.city, mode: "insensitive" as const } }
      : { isActive: true };

    // Only restrict *which providers appear* by city when explicitly filtering IN_PERSON
    if (k.city && k.mode === "IN_PERSON") {
      andClauses.push({ clinics: { some: clinicWhere } });
    }

    const whereClause = { AND: andClauses };

    // 7-day window for slot buckets — anchored inside the cached entry so
    // all viewers of a given cache entry see the same day buckets.
    const nowIST = new Date(Date.now());
    const windowEnd = new Date(nowIST.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [providers, total] = await Promise.all([
      prisma.provider.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
        skip: (k.page - 1) * k.pageSize,
        take: k.pageSize,
        select: {
          id: true,
          slug: true,
          name: true,
          speciality: true,
          qualification: true,
          languages: true,
          is24x7: true,
          defaultFeePaise: true,
          profilePhotoKey: true,
          visitModes: true,
          clinics: {
            where: clinicWhere,
            select: {
              id: true,
              clinicName: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              pincode: true,
              lat: true,
              lng: true,
              phone: true,
            },
            take: 3,
          },
          slots: {
            where: {
              isBooked: false,
              startsAt: { gte: nowIST, lt: windowEnd },
            },
            orderBy: { startsAt: "asc" },
            select: { id: true, startsAt: true, feePaise: true },
            take: 100,
          },
        },
      }),
      prisma.provider.count({ where: whereClause }),
    ]);

    // Build 7-day date labels (IST)
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(nowIST.getTime() + i * 24 * 60 * 60 * 1000);
      days.push(toISTDate(d));
    }

    const result = providers.map((p) => {
      // Bucket slots by IST date
      const slotsByDay: Record<string, { id: string; startsAt: string }[]> = {};
      for (const day of days) slotsByDay[day] = [];
      for (const slot of p.slots) {
        const day = toISTDate(slot.startsAt);
        if (slotsByDay[day]) slotsByDay[day].push({ id: slot.id, startsAt: slot.startsAt.toISOString() });
      }

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        speciality: p.speciality,
        qualification: p.qualification,
        languages: p.languages,
        is24x7: p.is24x7,
        defaultFeePaise: p.defaultFeePaise,
        profilePhotoKey: p.profilePhotoKey,
        visitModes: p.visitModes,
        clinics: p.clinics,
        slotsByDay,
        days,
      };
    });

    return { providers: result, total, days };
  },
  ["providers-search-v1"],
  { revalidate: 60 }
);

/**
 * GET /api/providers/search
 * Query params:
 *   city       - city name to filter clinics (default: Hyderabad)
 *   specialty  - specialty filter (partial match)
 *   mode       - IN_PERSON | VIDEO | AUDIO | "" (any)
 *   q          - name / specialty text search
 *   page       - page number (default 1)
 *   pageSize   - results per page (default 12)
 *
 * Returns providers with:
 *   - clinic locations (lat/lng for map)
 *   - 7-day slot availability buckets (counts per day in IST)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key: SearchKey = {
      city: searchParams.get("city")?.trim() || "",
      specialty: searchParams.get("specialty")?.trim() || "",
      mode: searchParams.get("mode")?.trim().toUpperCase() || "",
      q: searchParams.get("q")?.trim() || "",
      language: searchParams.get("language")?.trim().toLowerCase() || "",
      is24x7: searchParams.get("is24x7") === "true",
      page: Math.max(1, Number(searchParams.get("page") || 1)),
      pageSize: Math.min(24, Math.max(1, Number(searchParams.get("pageSize") || 12))),
    };

    const { providers, total, days } = await getCachedSearch(key);

    return NextResponse.json({ providers, total, page: key.page, pageSize: key.pageSize, days });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
