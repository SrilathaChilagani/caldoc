import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireNgoSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireNgoSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const speciality = url.searchParams.get("speciality")?.trim();
  const providerIds = url.searchParams.getAll("providerId").filter(Boolean);
  const days = Math.max(1, Math.min(30, Number(url.searchParams.get("days")) || 14));

  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const where: any = { isActive: true };
  if (speciality && speciality !== "all") {
    where.speciality = { contains: speciality, mode: "insensitive" };
  }
  if (providerIds.length) {
    where.id = { in: providerIds };
  }

  const providers = await prisma.provider.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      speciality: true,
      slug: true,
      languages: true,
      defaultFeePaise: true,
      slots: {
        where: {
          isBooked: false,
          startsAt: { gte: now, lte: end },
        },
        select: { id: true, startsAt: true, feePaise: true },
        orderBy: { startsAt: "asc" },
        take: 40,
      },
    },
  });

  return NextResponse.json({ providers });
}
