import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const breaches = await prisma.breachNotification.findMany({
    where: status ? { status } : {},
    orderBy: { discoveredAt: "desc" },
  });

  return NextResponse.json({ breaches });
}

export async function POST(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, severity, discoveredAt, affectedCount, notes } =
    body as {
      title?: string;
      description?: string;
      severity?: string;
      discoveredAt?: string;
      affectedCount?: number;
      notes?: string;
    };

  if (!title || !description || !severity || !discoveredAt) {
    return NextResponse.json(
      { error: "title, description, severity and discoveredAt required" },
      { status: 400 },
    );
  }

  const VALID_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  if (!VALID_SEVERITIES.includes(severity)) {
    return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
  }

  const breach = await prisma.breachNotification.create({
    data: {
      title,
      description,
      severity,
      discoveredAt: new Date(discoveredAt),
      affectedCount: affectedCount ?? null,
      notes: notes ?? null,
      createdBy: sess.userId,
    },
  });

  return NextResponse.json({ breach }, { status: 201 });
}
