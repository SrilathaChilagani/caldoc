import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const provider = await prisma.provider.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const agg = await prisma.appointmentRating.aggregate({
    where: { providerId: provider.id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const dist = await prisma.appointmentRating.groupBy({
    by: ["rating"],
    where: { providerId: provider.id },
    _count: { rating: true },
    orderBy: { rating: "asc" },
  });

  const recentReviews = await prisma.appointmentRating.findMany({
    where: { providerId: provider.id, comment: { not: null } },
    select: { rating: true, comment: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json({
    avg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    count: agg._count.rating,
    distribution: dist.map((d) => ({ rating: d.rating, count: d._count.rating })),
    recentReviews: recentReviews.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
