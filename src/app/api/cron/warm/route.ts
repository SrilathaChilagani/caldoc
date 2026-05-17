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
 * keeps the serverless function instance warm. Pinged on a short
 * interval by Vercel Cron and/or an external pinger (see
 * .github/workflows/warm.yml).
 *
 * Auth: same CRON_SECRET pattern as the other cron routes. Vercel
 * injects `Authorization: Bearer <CRON_SECRET>` automatically; external
 * pingers must send the same header.
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
