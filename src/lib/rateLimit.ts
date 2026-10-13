// In-process sliding-window rate limiter.
//
// Limitation: each serverless lambda instance keeps its own map, so the
// effective limit is maxRequests * <active instances> globally. This is
// still valuable as a first line of defence on public endpoints. Add
// Upstash/Redis if you need a coordinated global limit.

type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();
const MAX_ENTRIES = 10_000; // bound memory usage

/**
 * Check whether `key` (typically an IP address) has exceeded the limit.
 * Returns `{ allowed: true }` when under the limit, or
 * `{ allowed: false, retryAfterSec }` when over.
 */
export function checkRateLimit(
  key: string,
  opts: { maxRequests: number; windowMs: number },
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();

  // Evict the oldest entry when the store is full.
  if (store.size >= MAX_ENTRIES) {
    const first = store.keys().next().value;
    if (first !== undefined) store.delete(first);
  }

  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= opts.windowMs) {
    // New window
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0 };
  }

  entry.count += 1;

  if (entry.count > opts.maxRequests) {
    const retryAfterSec = Math.ceil((opts.windowMs - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfterSec };
  }

  return { allowed: true, retryAfterSec: 0 };
}

/** Extract the client IP from a Next.js request, preferring X-Forwarded-For. */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
