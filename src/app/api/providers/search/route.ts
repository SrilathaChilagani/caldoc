import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// 20 requests / 60 s per IP — search can trigger expensive DB queries
// across many unique filter combos, so use a tighter limit than the
// simpler providers list endpoint.
const RATE_LIMIT = { maxRequests: 20, windowMs: 60_000 };

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
  gender: string;
  minFeePaise: number;
  maxFeePaise: number;
  avail: string; // "any" | "today" | "week" | "24x7"
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
          { qualification: { contains: k.q, mode: "insensitive" } },
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
    if (k.gender) {
      andClauses.push({ gender: k.gender });
    }
    if (k.minFeePaise > 0) {
      andClauses.push({ defaultFeePaise: { gte: k.minFeePaise } });
    }
    if (k.maxFeePaise > 0) {
      andClauses.push({ defaultFeePaise: { lte: k.maxFeePaise } });
    }

    // 7-day window — computed here so all filter-path branches share nowIST/windowEnd
    const nowIST = new Date(Date.now());
    const windowEnd = new Date(nowIST.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (k.avail === "24x7") {
      andClauses.push({ is24x7: true });
    }
    if (k.avail === "today") {
      // End of today in IST — parse as IST midnight then add 24h - 1ms
      const istNow = new Date(nowIST.getTime() + IST_OFFSET_MS);
      const todayEndIST = new Date(`${istNow.toISOString().slice(0, 10)}T23:59:59.999+05:30`);
      andClauses.push({
        slots: { some: { isBooked: false, startsAt: { gte: nowIST, lte: todayEndIST } } },
      });
    }
    if (k.avail === "week") {
      andClauses.push({
        slots: { some: { isBooked: false, startsAt: { gte: nowIST, lt: windowEnd } } },
      });
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
          registrationNumber: true,
          councilName: true,
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
            select: { id: true, startsAt: true },
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
        registrationNumber: p.registrationNumber,
        councilName: p.councilName,
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
  ["providers-search-v2"],
  { revalidate: 60 }
);

/**
 * GET /api/providers/search
 * Query params:
 *   city       - city name to filter clinics (default: Hyderabad)
 *   specialty  - specialty filter (partial match)
 *   mode       - IN_PERSON | VIDEO | AUDIO | "" (any)
 *   q          - name / specialty / qualification text search
 *   language   - 2-letter language code
 *   gender     - "Male" | "Female" | "" (any)
 *   feeRange   - "under500" | "mid" | "over1000" | "" (any)
 *   avail      - "today" | "week" | "24x7" | "any"
 *   page       - page number (default 1)
 *   pageSize   - results per page (default 12)
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const feeRange = searchParams.get("feeRange")?.trim() || "";
    let minFeePaise = 0;
    let maxFeePaise = 0;
    if (feeRange === "under500") maxFeePaise = 49900;
    if (feeRange === "mid") { minFeePaise = 50000; maxFeePaise = 100000; }
    if (feeRange === "over1000") minFeePaise = 100100;

    const key: SearchKey = {
      city: searchParams.get("city")?.trim() || "",
      specialty: searchParams.get("specialty")?.trim() || "",
      mode: searchParams.get("mode")?.trim().toUpperCase() || "",
      q: searchParams.get("q")?.trim() || "",
      language: searchParams.get("language")?.trim().toLowerCase() || "",
      gender: searchParams.get("gender")?.trim() || "",
      minFeePaise,
      maxFeePaise,
      avail: searchParams.get("avail")?.trim() || "any",
      page: Math.max(1, Number(searchParams.get("page") || 1)),
      pageSize: Math.min(24, Math.max(1, Number(searchParams.get("pageSize") || 12))),
    };

    const { providers, total, days } = await getCachedSearch(key);

    return NextResponse.json(
      { providers, total, page: key.page, pageSize: key.pageSize, days },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
