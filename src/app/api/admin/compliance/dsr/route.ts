import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

// GET /api/admin/compliance/dsr  — list data subject requests
// Query: status?, type?, limit?, cursor?
export async function GET(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const cursor = searchParams.get("cursor") ?? undefined;

  const where = {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
  };

  const [total, requests] = await Promise.all([
    prisma.dataSubjectRequest.count({ where }),
    prisma.dataSubjectRequest.findMany({
      where,
      include: { patient: { select: { id: true, name: true, phone: true } } },
      orderBy: { requestedAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
  ]);

  const nextCursor =
    requests.length === limit ? requests[requests.length - 1].id : null;

  return NextResponse.json({ requests, total, nextCursor });
}

// POST /api/admin/compliance/dsr  — admin creates a DSR on behalf of patient
export async function POST(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { patientId, type, notes } = body as {
    patientId?: string;
    type?: string;
    notes?: string;
  };

  if (!patientId || !type) {
    return NextResponse.json({ error: "patientId and type required" }, { status: 400 });
  }

  const VALID_TYPES = ["ERASURE", "ACCESS", "PORTABILITY", "RECTIFICATION"];
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const dsr = await prisma.dataSubjectRequest.create({
    data: { patientId, type, notes: notes ?? null, handledBy: sess.userId },
  });

  return NextResponse.json({ dsr }, { status: 201 });
}
