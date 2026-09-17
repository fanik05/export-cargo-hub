/**
 * A fixed-window rate limiter held in process memory.
 *
 * Tracking numbers are sequential, so the public JSON route can be walked
 * (`ECH-2026-00001`, `00002`, …). This caps how fast that can be done.
 *
 * Deliberately in-memory: the app has one small database on the far side of a
 * ~300 ms link, and spending a round trip per request to count requests would
 * cost more than it saves. The trade-off is that each server instance keeps its
 * own counters, so the effective limit is `limit × instances` and a cold start
 * clears them. That is enough to stop enumeration at speed, which is the point;
 * it is not a billing-grade quota.
 */

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  /** Requests still allowed in the current window, never below zero. */
  remaining: number;
  /** Epoch milliseconds at which the current window ends. */
  resetAt: number;
  /** Whole seconds until the window ends, at least 1. */
  retryAfterSeconds: number;
};

export type RateLimiter = {
  check: (key: string, now?: number) => RateLimitResult;
  reset: () => void;
  size: () => number;
};

export type RateLimiterOptions = {
  limit: number;
  windowMs: number;
  /** Upper bound on tracked keys, so a client rotating addresses cannot grow the map without end. */
  maxKeys?: number;
};

export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
}: RateLimiterOptions): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();

  /** Entries are (re-)inserted at their window start, so Map insertion order is resetAt order. */
  function makeRoom(now: number) {
    if (hits.size < maxKeys) return;
    for (const [key, entry] of hits) {
      if (entry.resetAt > now) break;
      hits.delete(key);
    }
    while (hits.size >= maxKeys) {
      const oldest = hits.keys().next();
      if (oldest.done) break;
      hits.delete(oldest.value);
    }
  }

  return {
    check(key, now = Date.now()) {
      const existing = hits.get(key);

      if (!existing || existing.resetAt <= now) {
        // Delete before setting so the key moves to the back of the insertion order.
        if (existing) hits.delete(key);
        makeRoom(now);
        const resetAt = now + windowMs;
        hits.set(key, { count: 1, resetAt });
        return {
          ok: true,
          limit,
          remaining: Math.max(0, limit - 1),
          resetAt,
          retryAfterSeconds: retryAfter(resetAt, now),
        };
      }

      existing.count += 1;
      return {
        ok: existing.count <= limit,
        limit,
        remaining: Math.max(0, limit - existing.count),
        resetAt: existing.resetAt,
        retryAfterSeconds: retryAfter(existing.resetAt, now),
      };
    },
    reset() {
      hits.clear();
    },
    size() {
      return hits.size;
    },
  };
}

function retryAfter(resetAt: number, now: number): number {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

/**
 * Identifies the caller for rate-limiting purposes.
 *
 * `x-forwarded-for` is only trustworthy behind a proxy that sets it (Vercel and
 * most hosts do). Direct to the origin it can be forged, so this is a speed bump
 * rather than an access control. Callers with no usable address share the
 * `unknown` bucket, which limits them together rather than exempting them.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export const TRACK_RATE_LIMIT = 30;
export const TRACK_RATE_WINDOW_MS = 60_000;

// One limiter per process, kept on globalThis so dev hot reloads do not reset the counters.
const globalForRateLimit = globalThis as unknown as { trackLimiter?: RateLimiter };

export const trackLimiter =
  globalForRateLimit.trackLimiter ??
  createRateLimiter({ limit: TRACK_RATE_LIMIT, windowMs: TRACK_RATE_WINDOW_MS });

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.trackLimiter = trackLimiter;
}
