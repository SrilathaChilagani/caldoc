import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const departments = await prisma.department.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { employees: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(departments);
}

export async function POST(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const dept = await prisma.department.create({ data: { name, description: description || null } });
  return NextResponse.json(dept, { status: 201 });
}
