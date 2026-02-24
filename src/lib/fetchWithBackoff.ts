type FetchRetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOnStatuses?: number[];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withJitter(ms: number) {
  return Math.floor(ms * (0.8 + Math.random() * 0.4));
}

export async function fetchWithBackoff(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts: FetchRetryOptions = {}
): Promise<Response> {
  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 300;
  const maxDelayMs = opts.maxDelayMs ?? 5000;
  const retryOnStatuses = opts.retryOnStatuses ?? [408, 409, 425, 429, 500, 502, 503, 504];

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      const res = await fetch(input, init);
      if (!retryOnStatuses.includes(res.status) || attempt === retries) {
        return res;
      }
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await sleep(withJitter(delay));
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await sleep(withJitter(delay));
    }

    attempt += 1;
  }

  throw lastError instanceof Error ? lastError : new Error("fetchWithBackoff failed");
}
