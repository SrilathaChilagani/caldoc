import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { dispatchLabOrder } from "@/lib/lab";

export const dynamic = "force-dynamic";

const RETRY_WINDOW_MS = 48 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const since = new Date(Date.now() - RETRY_WINDOW_MS);

    const failed = await prisma.labOrder.findMany({
      where: {
        dispatchStatus: "FAILED",
        status: "PENDING",
        updatedAt: { gte: since },
        labPartnerId: { not: null },
      },
      select: { id: true },
    });

    const results = await Promise.allSettled(
      failed.map((o) => dispatchLabOrder(o.id)),
    );

    const retried     = results.length;
    const succeeded   = results.filter((r) => r.status === "fulfilled").length;
    const stillFailed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ ok: true, retried, succeeded, stillFailed, at: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}
