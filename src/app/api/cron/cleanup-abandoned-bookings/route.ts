import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// How long a PENDING appointment may sit before its slot is released.
const ABANDON_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
  // Require a shared secret so only authorised callers (e.g. a cron scheduler)
  // can trigger cleanup. Set CRON_SECRET in your environment variables.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const cutoff = new Date(Date.now() - ABANDON_TIMEOUT_MS);

    // Find PENDING appointments older than the timeout that have no captured payment.
    const abandoned = await prisma.appointment.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: cutoff },
        OR: [
          { payment: { is: null } },
          { payment: { status: { not: "CAPTURED" } } },
        ],
      },
      select: { id: true, slotId: true },
      take: 100, // process in batches to avoid long-running transactions
    });

    if (abandoned.length === 0) {
      return NextResponse.json({ released: 0, expired: 0 });
    }

    const slotIds = abandoned.map((a) => a.slotId).filter((id): id is string => !!id);
    const appointmentIds = abandoned.map((a) => a.id);

    // Atomically: free the slots and mark appointments as EXPIRED.
    await prisma.$transaction([
      prisma.slot.updateMany({
        where: { id: { in: slotIds } },
        data: { isBooked: false },
      }),
      prisma.appointment.updateMany({
        where: { id: { in: appointmentIds } },
        data: { status: "EXPIRED" },
      }),
    ]);

    console.log(
      `[cleanup-abandoned-bookings] Released ${slotIds.length} slot(s), expired ${appointmentIds.length} appointment(s)`
    );

    return NextResponse.json({ released: slotIds.length, expired: appointmentIds.length });
  } catch (err) {
    console.error("[cleanup-abandoned-bookings] Error:", err);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
