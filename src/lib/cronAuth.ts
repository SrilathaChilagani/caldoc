import { NextRequest, NextResponse } from "next/server";

const PLACEHOLDER = "dev-please-change";

/**
 * Validates the cron request's Bearer token against CRON_SECRET.
 * Returns null when auth passes; returns a NextResponse error otherwise.
 *
 * In production, the placeholder value is treated as "not configured" so a
 * forgotten CRON_SECRET= swap still locks the endpoint rather than exposing it.
 */
export function requireCronAuth(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron-auth] CRON_SECRET is not set — endpoint locked");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (process.env.NODE_ENV === "production" && cronSecret === PLACEHOLDER) {
    console.error("[cron-auth] CRON_SECRET is still the default placeholder in production — endpoint locked");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
