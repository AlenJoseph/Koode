import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { SessionUser } from '@koode/contracts';
import type { AuthService } from '../auth/service.js';
import type { ApiConfig } from '../config.js';
import type { LearnerPathwayService } from '../learning/pathways-learner.js';
import { clearSessionCookie, readSessionToken } from '../lib/cookies.js';

export async function registerLearningRoutes(
  app: FastifyInstance,
  deps: {
    config: ApiConfig;
    auth: AuthService;
    learnerPathways: LearnerPathwayService;
  },
): Promise<void> {
  const { config, auth, learnerPathways } = deps;

  async function requireUser(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<SessionUser | null> {
    const sessionToken = readSessionToken(request, config);
    if (!sessionToken) {
      await reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }
    const user = await auth.getUserForSessionToken(sessionToken);
    if (!user) {
      clearSessionCookie(reply, config);
      await reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }
    return user;
  }

  app.get('/pathways', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }
    const list = await learnerPathways.listPublished();
    return { pathways: list };
  });

  app.get('/pathways/enrollments', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }
    const enrollments = await learnerPathways.listEnrollments(user.id);
    return { enrollments };
  });

  app.post('/pathways/:pathwayId/enroll', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }
    const { pathwayId } = request.params as { pathwayId: string };
    const enrollment = await learnerPathways.startEnrollment(user.id, pathwayId);
    request.log.info(
      { event: 'learning.pathway_enrolled', pathwayId, enrollmentId: enrollment.id },
      'pathway enrollment started',
    );
    return { enrollment };
  });
}
