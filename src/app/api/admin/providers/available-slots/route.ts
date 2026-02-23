import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const providers = await prisma.provider.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      speciality: true,
      slots: {
        where: {
          isBooked: false,
          startsAt: { gt: new Date() },
        },
        orderBy: { startsAt: "asc" },
        take: 20,
        select: { id: true, startsAt: true, feePaise: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ providers });
}
