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
  // A fully scale-to-zero'd Neon compute can take a couple seconds to
  // activate, and the first connection may time out before it's ready.
  // Retry so a cold DB — the exact case this endpoint exists to warm —
  // doesn't produce a spurious 500 (and a failed keep-alive run).
  const maxAttempts = 4;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Cheapest possible round-trip that forces the DB compute to wake.
      await prisma.$queryRaw`SELECT 1`;
      return NextResponse.json({
        ok: true,
        dbMs: Date.now() - startedAt,
        attempts: attempt,
        at: new Date().toISOString(),
      });
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
  return NextResponse.json(
    {
      ok: false,
      error: getErrorMessage(lastErr),
      dbMs: Date.now() - startedAt,
      attempts: maxAttempts,
    },
    { status: 500 }
  );
}
