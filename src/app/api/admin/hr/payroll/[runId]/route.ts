import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ runId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { runId } = await params;

  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: {
      payslips: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeCode: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { employee: { name: "asc" } },
      },
    },
  });

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...run,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    processedAt: run.processedAt?.toISOString() ?? null,
    payslips: run.payslips.map((p) => ({
      ...p,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}

// PATCH — update run status (DRAFT → COMPLETED | CANCELLED)
export async function PATCH(req: NextRequest, { params }: Params) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { runId } = await params;
  const { status, note } = await req.json();

  if (!["COMPLETED", "CANCELLED", "DRAFT"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const run = await prisma.payrollRun.update({
    where: { id: runId },
    data: {
      status,
      note: note ?? undefined,
      processedAt: status === "COMPLETED" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ ...run, createdAt: run.createdAt.toISOString(), updatedAt: run.updatedAt.toISOString(), processedAt: run.processedAt?.toISOString() ?? null });
}
