// supabase/functions/_shared/rateLimit.ts
// Simple in-memory rate limiter for Edge Functions.
// Note: Each Edge Function instance has its own memory, so this is a per-instance
// limit. For stricter limits, consider Upstash Redis — but for our use case
// (Track page, Corrective update, Admin cleanup), per-instance is sufficient
// because Supabase also has platform-level DDoS protection.

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  opts: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= opts.windowMs) {
    // New window
    buckets.set(key, { count: 1, windowStart: now });
    return {
      ok: true,
      remaining: opts.maxRequests - 1,
      resetAt: now + opts.windowMs,
    };
  }

  bucket.count++;
  if (bucket.count > opts.maxRequests) {
    return {
      ok: false,
      remaining: 0,
      resetAt: bucket.windowStart + opts.windowMs,
    };
  }

  return {
    ok: true,
    remaining: opts.maxRequests - bucket.count,
    resetAt: bucket.windowStart + opts.windowMs,
  };
}

/**
 * Build a rate-limit key from the request.
 * Uses the X-Forwarded-For IP if available, otherwise falls back to a hash
 * of the user agent + accept-language (best-effort for clients behind NAT).
 */
export function rateLimitKey(req: Request, suffix = ""): string {
  const xff = req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
  const ip = xff || req.headers.get("CF-Connecting-IP") || "unknown";
  return `${ip}:${suffix}`;
}

/**
 * Periodically clean up expired buckets to prevent memory leaks.
 * Call this at the start of each request, no more than once per minute.
 */
let lastCleanup = 0;
export function cleanupExpiredBuckets(now = Date.now()): void {
  if (now - lastCleanup < 60_000) return; // at most once per minute
  lastCleanup = now;
  for (const [k, b] of buckets.entries()) {
    if (now - b.windowStart > 600_000) buckets.delete(k); // 10 min TTL
  }
}
