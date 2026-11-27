import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCronAuth } from "@/lib/cronAuth";
import { getErrorMessage } from "@/lib/errors";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

// Max retries before giving up and marking FAILED permanently
const MAX_RETRIES = 5;

// Exponential backoff delays (minutes): 5, 15, 60, 240, 1440
function backoffMinutes(retryCount: number): number {
  const schedule = [5, 15, 60, 240, 1440];
  return schedule[Math.min(retryCount, schedule.length - 1)];
}

function appBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://caldoc.in"
  );
}

async function replayWebhookEvent(webhookEvent: {
  id: string;
  source: string;
  type: string;
  payload: unknown;
  retryCount: number;
}): Promise<void> {
  // Re-POST the original payload to our own webhook endpoint
  // using the internal cron secret so the endpoint skips signature verification
  const baseUrl = appBaseUrl();

  let endpoint: string;
  if (webhookEvent.source === "razorpay") {
    endpoint = `${baseUrl}/api/webhooks/razorpay`;
  } else {
    throw new Error(`Unknown webhook source: ${webhookEvent.source}`);
  }

  // Create a valid Razorpay-style HMAC so the endpoint's signature check passes
  const webhookSecret = process.env.RZP_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("RZP_WEBHOOK_SECRET not set");

  const rawBody = JSON.stringify(webhookEvent.payload);
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": signature,
      "x-webhook-retry": "true", // informational header
    },
    body: rawBody,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webhook replay returned ${res.status}: ${text}`);
  }
}

export async function GET(req: NextRequest) {
  const authError = requireCronAuth(req);
  if (authError) return authError;

  const now = new Date();

  // Pick up events due for retry
  const events = await prisma.webhookEvent.findMany({
    where: {
      status: "PENDING_RETRY",
      nextRetryAt: { lte: now },
    },
    orderBy: { nextRetryAt: "asc" },
    take: 50,
  });

  if (events.length === 0) {
    return NextResponse.json({ ok: true, retried: 0 });
  }

  let succeeded = 0;
  let failed = 0;

  for (const event of events) {
    try {
      await replayWebhookEvent({
        id: event.id,
        source: event.source,
        type: event.type,
        payload: event.payload,
        retryCount: event.retryCount,
      });

      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: "PROCESSED", lastError: null },
      });
      succeeded++;
    } catch (err) {
      const errMsg = getErrorMessage(err);
      const newRetryCount = event.retryCount + 1;

      if (newRetryCount >= MAX_RETRIES) {
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: "FAILED",
            retryCount: newRetryCount,
            lastError: errMsg,
            nextRetryAt: null,
          },
        });
        Sentry.captureException(err, {
          extra: { webhookEventId: event.id, source: event.source, retryCount: newRetryCount },
        });
      } else {
        const delayMs = backoffMinutes(newRetryCount) * 60 * 1000;
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            retryCount: newRetryCount,
            lastError: errMsg,
            nextRetryAt: new Date(Date.now() + delayMs),
          },
        });
      }
      failed++;
    }
  }

  return NextResponse.json({ ok: true, retried: events.length, succeeded, failed });
}
