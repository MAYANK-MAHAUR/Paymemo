/**
 * Lightweight per-IP rate limiter for unauthenticated POST endpoints.
 *
 * This is an in-memory sliding-window counter that runs in the worker process.
 * It is not a distributed rate limit. For a hardened production deploy, swap
 * the backing store for a Cloudflare Durable Object or a Redis key.
 */

const buckets = new Map<string, { count: number; windowStart: number }>();

const DEFAULT_WINDOW_MS = 60_000;

export type RateLimitOptions = {
  limit: number;
  windowMs?: number;
  scope: string;
};

function clientKey(request: Request, scope: string) {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();
  const cfConnecting = headers.get("cf-connecting-ip")?.trim();
  const fallback = headers.get("user-agent") ?? "anonymous";
  const ip = cfConnecting || forwarded || realIp || fallback;
  return `${scope}:${ip}`;
}

export function checkRateLimit(
  request: Request,
  options: RateLimitOptions,
): { ok: true } | { ok: false; retryAfter: number; response: Response } {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const key = clientKey(request, options.scope);
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    if (buckets.size > 5000) {
      const cutoff = now - windowMs;
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.windowStart < cutoff) buckets.delete(bucketKey);
      }
    }
    return { ok: true };
  }

  if (existing.count >= options.limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.windowStart + windowMs - now) / 1000));
    return {
      ok: false,
      retryAfter,
      response: Response.json(
        {
          error: "Too many requests. Slow down.",
          retryAfterSeconds: retryAfter,
        },
        { status: 429, headers: { "retry-after": String(retryAfter) } },
      ),
    };
  }

  existing.count += 1;
  return { ok: true };
}
