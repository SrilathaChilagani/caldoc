import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";

// IST offset in ms
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toISTDate(date: Date): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return ist.toISOString().slice(0, 10); // YYYY-MM-DD
}

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
    const city = searchParams.get("city")?.trim() || "";
    const specialty = searchParams.get("specialty")?.trim() || "";
    const mode = searchParams.get("mode")?.trim().toUpperCase() || "";
    const q = searchParams.get("q")?.trim() || "";
    const language = searchParams.get("language")?.trim().toLowerCase() || "";
    const is24x7 = searchParams.get("is24x7") === "true";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(24, Math.max(1, Number(searchParams.get("pageSize") || 12)));

    // Build provider where clause
    const andClauses: object[] = [{ isActive: true }];

    if (specialty) {
      andClauses.push({ speciality: { contains: specialty, mode: "insensitive" } });
    }
    if (q) {
      andClauses.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { speciality: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    if (mode === "IN_PERSON") {
      andClauses.push({ clinics: { some: { isActive: true } } });
    }
    if (mode && mode !== "IN_PERSON") {
      andClauses.push({ visitModes: { has: mode } });
    }
    if (language) {
      andClauses.push({ languages: { has: language } });
    }
    if (is24x7) {
      andClauses.push({ is24x7: true });
    }

    // Clinic sub-query: only filter by city for the clinic addresses we show on cards/map
    // For IN_PERSON mode the city filter is already applied above; for other modes
    // we still want to show the provider but only show clinics in that city.
    const clinicWhere = city
      ? { isActive: true, city: { contains: city, mode: "insensitive" as const } }
      : { isActive: true };

    // Only restrict *which providers appear* by city when explicitly filtering IN_PERSON
    if (city && mode === "IN_PERSON") {
      andClauses.push({ clinics: { some: clinicWhere } });
    }

    const whereClause = { AND: andClauses };

    // 7-day window for slot buckets
    const nowIST = new Date(Date.now());
    const windowEnd = new Date(nowIST.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [providers, total] = await Promise.all([
      prisma.provider.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
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

    return NextResponse.json({ providers: result, total, page, pageSize, days });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
