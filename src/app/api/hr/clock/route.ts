import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

// GET — today's attendance record for an employee
export async function GET(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  if (!employeeId) return NextResponse.json({ error: "employeeId required" }, { status: 400 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });

  return NextResponse.json(
    record
      ? {
          ...record,
          date: record.date.toISOString().slice(0, 10),
          clockIn: record.clockIn?.toISOString() ?? null,
          clockOut: record.clockOut?.toISOString() ?? null,
        }
      : null
  );
}

// POST — clock in or clock out
export async function POST(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, action } = await req.json();
  if (!employeeId || !["CLOCK_IN", "CLOCK_OUT"].includes(action)) {
    return NextResponse.json({ error: "employeeId and action (CLOCK_IN|CLOCK_OUT) required" }, { status: 400 });
  }

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });

  if (action === "CLOCK_IN") {
    if (existing?.clockIn) {
      return NextResponse.json({ error: "Already clocked in today" }, { status: 409 });
    }
    const record = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      create: { employeeId, date: today, clockIn: now, status: "PRESENT" },
      update: { clockIn: now, status: "PRESENT" },
    });
    return NextResponse.json({ ...record, date: record.date.toISOString().slice(0, 10), clockIn: record.clockIn?.toISOString() ?? null, clockOut: null });
  }

  // CLOCK_OUT
  if (!existing?.clockIn) {
    return NextResponse.json({ error: "Must clock in first" }, { status: 409 });
  }
  if (existing.clockOut) {
    return NextResponse.json({ error: "Already clocked out today" }, { status: 409 });
  }

  const workMinutes = Math.round((now.getTime() - existing.clockIn.getTime()) / 60000);
  const status = workMinutes < 240 ? "HALF_DAY" : "PRESENT";

  const record = await prisma.attendance.update({
    where: { id: existing.id },
    data: { clockOut: now, workMinutes, status },
  });

  return NextResponse.json({
    ...record,
    date: record.date.toISOString().slice(0, 10),
    clockIn: record.clockIn?.toISOString() ?? null,
    clockOut: record.clockOut?.toISOString() ?? null,
  });
}
