import type { ApiConfig } from '../config.js';

/** Per-route config recognized by CodeQL (`@fastify/rate-limit`). */
export function authRateLimitConfig(config: ApiConfig) {
  return {
    rateLimit: {
      max: config.rateLimitMagicLinkMax,
      timeWindow: config.rateLimitMagicLinkWindowMs,
    },
  };
}
