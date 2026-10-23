import type { FastifyInstance } from 'fastify';
import type { AuthService } from '../auth/service.js';
import type { ApiConfig } from '../config.js';
import { clearSessionCookie, readSessionToken, setSessionCookie } from '../lib/cookies.js';
import type { MemoryRateLimiter } from '../lib/rate-limit.js';

export async function registerAuthRoutes(
  app: FastifyInstance,
  deps: {
    config: ApiConfig;
    auth: AuthService;
    magicLinkLimiter: MemoryRateLimiter;
  },
): Promise<void> {
  const { config, auth, magicLinkLimiter } = deps;

  app.post('/auth/magic-link/request', async (request, reply) => {
    const key = `magic:${request.ip}`;
    const limit = magicLinkLimiter.check(key);
    if (!limit.ok) {
      reply.header('retry-after', String(limit.retryAfterSec));
      return reply.status(429).send({ error: 'rate_limited', retryAfterSec: limit.retryAfterSec });
    }

    request.log.info({ event: 'auth.magic_link_requested' }, 'magic link requested');
    return auth.requestMagicLink(request.body);
  });

  app.post('/auth/magic-link/verify', async (request, reply) => {
    const result = await auth.verifyMagicLink(request.body);
    setSessionCookie(reply, config, result.sessionToken, result.expiresAt);
    request.log.info({ event: 'auth.session_created', userId: result.user.id }, 'session created');
    return { ok: true, user: result.user };
  });

  app.get('/auth/me', async (request, reply) => {
    const sessionToken = readSessionToken(request, config);
    if (!sessionToken) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const user = await auth.getUserForSessionToken(sessionToken);
    if (!user) {
      clearSessionCookie(reply, config);
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    return { user };
  });

  app.post('/auth/logout', async (request, reply) => {
    const sessionToken = readSessionToken(request, config);
    if (sessionToken) {
      await auth.revokeSession(sessionToken);
    }
    clearSessionCookie(reply, config);
    request.log.info({ event: 'auth.logout' }, 'session revoked');
    return { ok: true };
  });
}
