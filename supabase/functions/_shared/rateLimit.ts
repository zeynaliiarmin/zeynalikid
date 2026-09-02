import { sendSecurityAlert } from "./securityAlert.ts";
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

export interface CentralRateLimitOptions extends RateLimitOptions {
  /** Optional lock duration after the limit is exceeded. */
  blockMs?: number;
}

/**
 * Database-backed, cross-instance rate limit for security-sensitive operations.
 * The raw IP/identity is SHA-256 hashed before storage. If the database helper is
 * temporarily unavailable, it fails closed to the existing per-instance limiter
 * instead of making the endpoint unavailable.
 */
export async function centralRateLimit(
  req: Request,
  scope: string,
  opts: CentralRateLimitOptions,
  identity = "",
): Promise<RateLimitResult & { retryAfterSeconds: number }> {
  const rawKey = `${rateLimitKey(req, scope)}:${String(identity || "").slice(0, 100)}`;
  const bytes = new TextEncoder().encode(rawKey);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const rateKey = `${scope}:${hash}`;
  const ipForAlert = req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || req.headers.get("CF-Connecting-IP") || "unknown";

  try {
    const { getSupabaseAdmin } = await import("./supabaseClient.ts");
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_key: rateKey,
      p_limit: opts.maxRequests,
      p_window_seconds: Math.max(1, Math.ceil(opts.windowMs / 1000)),
      p_block_seconds: Math.max(0, Math.ceil((opts.blockMs || 0) / 1000)),
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.allowed !== true) {
      void sendSecurityAlert("rate-limit", `scope=${scope}; ip=${ipForAlert}; retryAfter=${Number(row?.retry_after_seconds || 0)}s`, `${scope}:${ipForAlert}`);
    }
    return {
      ok: row?.allowed === true,
      remaining: Number(row?.remaining || 0),
      resetAt: Date.now() + Number(row?.retry_after_seconds || 0) * 1000,
      retryAfterSeconds: Number(row?.retry_after_seconds || 0),
    };
  } catch (error) {
    console.warn("central rate-limit fallback:", String((error as Error)?.message || error));
    const local = rateLimit(rateKey, opts);
    if (!local.ok) void sendSecurityAlert("rate-limit", `scope=${scope}; ip=${ipForAlert}; fallback-local`, `${scope}:${ipForAlert}`);
    return {
      ...local,
      retryAfterSeconds: local.ok ? 0 : Math.max(1, Math.ceil((local.resetAt - Date.now()) / 1000)),
    };
  }
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
