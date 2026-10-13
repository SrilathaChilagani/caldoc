import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// 30 requests / 60 s per IP — provider list is a lightweight public endpoint
const RATE_LIMIT = { maxRequests: 30, windowMs: 60_000 };

// Cache DB result for 5 minutes — active provider list is stable.
// Keyed by specialty so filtering still works, but repeated identical
// queries skip the DB entirely.
const getCachedProviders = unstable_cache(
  async (specialty: string) => {
    return prisma.provider.findMany({
      where: {
        isActive: true,
        ...(specialty
          ? { speciality: { contains: specialty, mode: "insensitive" } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        speciality: true,
        qualification: true,
        languages: true,
        defaultFeePaise: true,
        profilePhotoKey: true,
      },
      orderBy: { name: "asc" },
      take: 50,
    });
  },
  ["app-providers-v1"],
  { revalidate: 300 }, // 5 minutes
);

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const specialty = req.nextUrl.searchParams.get("specialty")?.trim() || "";
  const providers = await getCachedProviders(specialty);

  return NextResponse.json(
    { providers },
    {
      headers: {
        // Let Vercel Edge cache this for 60s; serve stale for up to 5 min
        // while revalidating in the background.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
