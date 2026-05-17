import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";

// Keep this handler from being statically optimised — it must run on every hit.
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/warm
 *
 * Lightweight keep-alive: issues a trivial query so the Neon compute
 * (which scale-to-zero suspends after ~5 min idle) stays awake, and
 * keeps the serverless function instance warm. Pinged every 5 min by
 * a GitHub Actions workflow (see .github/workflows/warm.yml) — Vercel
 * Hobby crons only fire once/day, too slow to outrun Neon's ~5 min
 * idle suspend.
 *
 * Auth: same CRON_SECRET pattern as the other cron routes. The pinger
 * must send `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startedAt = Date.now();
  try {
    // Cheapest possible round-trip that forces the DB compute to wake.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      dbMs: Date.now() - startedAt,
      at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(err), dbMs: Date.now() - startedAt },
      { status: 500 }
    );
  }
}
