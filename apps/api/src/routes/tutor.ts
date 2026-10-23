import type { FastifyInstance } from 'fastify';
import type { AuthService } from '../auth/service.js';
import type { ApiConfig } from '../config.js';
import { clearSessionCookie, readSessionToken } from '../lib/cookies.js';
import type { MemoryRateLimiter } from '../lib/rate-limit.js';
import type { TutorService } from '../tutor/service.js';

export async function registerTutorRoutes(
  app: FastifyInstance,
  deps: {
    config: ApiConfig;
    auth: AuthService;
    tutorService: TutorService;
    adapterId: string;
    tutorLimiter: MemoryRateLimiter;
  },
): Promise<void> {
  const { config, auth, tutorService, adapterId, tutorLimiter } = deps;

  app.get('/tutor/turns', async (request, reply) => {
    const sessionToken = readSessionToken(request, config);
    if (!sessionToken) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const user = await auth.getUserForSessionToken(sessionToken);
    if (!user) {
      clearSessionCookie(reply, config);
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    auth.requireLearnerSide(user);
    const turns = await tutorService.listForUser(user.id);
    return { turns };
  });

  app.post('/tutor/turn', async (request, reply) => {
    const sessionToken = readSessionToken(request, config);
    if (!sessionToken) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const user = await auth.getUserForSessionToken(sessionToken);
    if (!user) {
      clearSessionCookie(reply, config);
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    auth.requireLearnerSide(user);

    const limit = tutorLimiter.check(`tutor:${user.id}`);
    if (!limit.ok) {
      reply.header('retry-after', String(limit.retryAfterSec));
      return reply.status(429).send({ error: 'rate_limited', retryAfterSec: limit.retryAfterSec });
    }

    const turn = await tutorService.runAndPersist(request.body, {
      userId: user.id,
      adapterId,
      requestId: request.id,
    });

    request.log.info(
      {
        event: 'tutor.turn_completed',
        userId: user.id,
        adapterId,
        phase: turn.phase,
        nextPhase: turn.nextPhase,
      },
      'tutor turn completed',
    );

    return {
      ok: true,
      adapter: adapterId,
      userId: user.id,
      turn,
    };
  });
}
