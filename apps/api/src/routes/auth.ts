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

  app.post('/auth/emails/claim/request', async (request, reply) => {
    const sessionToken = readSessionToken(request, config);
    if (!sessionToken) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const user = await auth.getUserForSessionToken(sessionToken);
    if (!user) {
      clearSessionCookie(reply, config);
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const key = `claim:${user.id}`;
    const limit = magicLinkLimiter.check(key);
    if (!limit.ok) {
      reply.header('retry-after', String(limit.retryAfterSec));
      return reply.status(429).send({ error: 'rate_limited', retryAfterSec: limit.retryAfterSec });
    }

    const result = await auth.requestClaimEmail(user.id, request.body);
    request.log.info({ event: 'auth.email_claim_requested', userId: user.id }, 'claim email requested');
    return result;
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

  app.get('/auth/emails', async (request, reply) => {
    const sessionToken = readSessionToken(request, config);
    if (!sessionToken) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const user = await auth.getUserForSessionToken(sessionToken);
    if (!user) {
      clearSessionCookie(reply, config);
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const rows = await auth.emails.listEmails(user.id);
    return {
      emails: rows.map((row) => ({
        id: row.id,
        email: row.email,
        isPrimary: row.isPrimary,
        verifiedAt: row.verifiedAt,
      })),
    };
  });

  app.post('/auth/emails/:emailId/primary', async (request, reply) => {
    const sessionToken = readSessionToken(request, config);
    if (!sessionToken) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const user = await auth.getUserForSessionToken(sessionToken);
    if (!user) {
      clearSessionCookie(reply, config);
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const { emailId } = request.params as { emailId: string };
    const result = await auth.emails.setPrimaryEmail(user.id, emailId);
    return { email: result };
  });

  app.delete('/auth/emails/:emailId', async (request, reply) => {
    const sessionToken = readSessionToken(request, config);
    if (!sessionToken) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const user = await auth.getUserForSessionToken(sessionToken);
    if (!user) {
      clearSessionCookie(reply, config);
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const { emailId } = request.params as { emailId: string };
    await auth.emails.removeEmail(user.id, emailId);
    return { ok: true };
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
