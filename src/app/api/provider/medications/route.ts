import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readProviderSession, requireAdminSession } from "@/lib/auth.server";

export async function GET(req: NextRequest) {
  const adminSess = await requireAdminSession();
  const providerSess = adminSess ? null : await readProviderSession();
  if (!adminSess && !providerSess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ medications: [] });
  }

  const medications = await prisma.medication.findMany({
    where: {
      name: {
        contains: query,
        mode: "insensitive",
      },
    },
    orderBy: { name: "asc" },
    take: 8,
    select: { id: true, name: true, generic: true, category: true, form: true, strength: true },
  });

  return NextResponse.json({ medications });
}
