import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

// GET /api/admin/compliance/consent
// Returns paginated patient consent audit list.
// Query: cursor?, limit?, filter=ALL|CONSENTED|MISSING
export async function GET(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "ALL";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const cursor = searchParams.get("cursor") ?? undefined;

  const where =
    filter === "CONSENTED"
      ? { consentAt: { not: null } }
      : filter === "MISSING"
        ? { consentAt: null }
        : {};

  const [total, patients] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        consentAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
  ]);

  const nextCursor =
    patients.length === limit ? patients[patients.length - 1].id : null;

  return NextResponse.json({ patients, total, nextCursor });
}
