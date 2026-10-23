export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

export type MemoryRateLimiter = {
  check: (key: string) => RateLimitResult;
  reset: () => void;
};

/**
 * Process-local fixed-window limiter.
 * Fine for single-instance / local. Swap for Redis later without changing callers.
 */
export function createMemoryRateLimiter(options: {
  windowMs: number;
  max: number;
}): MemoryRateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = hits.get(key);

      if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + options.windowMs });
        return { ok: true, remaining: Math.max(0, options.max - 1) };
      }

      if (entry.count >= options.max) {
        return {
          ok: false,
          retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
        };
      }

      entry.count += 1;
      return { ok: true, remaining: Math.max(0, options.max - entry.count) };
    },
    reset() {
      hits.clear();
    },
  };
}
