import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const specialty = searchParams.get("specialty") || "";

  const providers = await prisma.provider.findMany({
    where: {
      isActive: true,
      ...(specialty ? { speciality: { contains: specialty, mode: "insensitive" } } : {}),
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

  return NextResponse.json({ providers });
}
