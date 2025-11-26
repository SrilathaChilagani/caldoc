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
      title: true,     // if you have it
      rating: true,    // if you have it
      reviews: true,   // if you have it
      imageUrl: true,  // if you have it (or map to your image field)
      specialty: true, // optional
    },
  });

  return NextResponse.json({ providers });
}
