/**
 * Minimal in-memory fixed-window rate limiter. Per process (fine for a single container; put a
 * shared store behind it if the portal is ever scaled out). Keys must never contain secrets —
 * the magic-link token is not part of any key.
 */
export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export type RateLimiter = {
  hit(key: string, now?: number): RateLimitResult;
  reset(): void;
};

export function createRateLimiter(opts: {
  limit: number;
  windowMs: number;
}): RateLimiter {
  const buckets = new Map<string, { start: number; count: number }>();
  return {
    hit(key, now = Date.now()) {
      // Opportunistic cleanup keeps the map bounded.
      if (buckets.size > 5000) {
        for (const [k, b] of buckets)
          if (now - b.start >= opts.windowMs) buckets.delete(k);
      }
      const b = buckets.get(key);
      if (!b || now - b.start >= opts.windowMs) {
        buckets.set(key, { start: now, count: 1 });
        return { ok: true };
      }
      if (b.count >= opts.limit) {
        return {
          ok: false,
          retryAfterSec: Math.ceil((b.start + opts.windowMs - now) / 1000),
        };
      }
      b.count++;
      return { ok: true };
    },
    reset() {
      buckets.clear();
    },
  };
}

/** Best-effort client address behind a reverse proxy. */
export function clientKey(headers: { get(name: string): string | null }): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip") || "ismeretlen";
}

/** Public magic-link page: viewing and deciding, per client address. */
export const igazolasMegtekintesLimiter = createRateLimiter({
  limit: 60,
  windowMs: 60_000,
});
export const igazolasDontesLimiter = createRateLimiter({
  limit: 10,
  windowMs: 10 * 60_000,
});
/** Login / reset requests per client address (on top of the per-account lockout). */
export const belepesLimiter = createRateLimiter({ limit: 20, windowMs: 10 * 60_000 });
