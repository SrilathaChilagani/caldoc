import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await prisma.provider.findMany({
    take: 6,
    orderBy: { name: "asc" }, // fallback to alphabetical until createdAt exists
    select: {
      id: true,
      slug: true,
      name: true,
      speciality: true,
      profilePhotoKey: true,
      languages: true,
    },
  });

  return NextResponse.json({ providers });
}
