import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { SessionUser } from '@koode/contracts';
import type { AuthService } from '../auth/service.js';
import type { ApiConfig } from '../config.js';
import type { LearnerChallengeService } from '../learning/challenges-learner.js';
import type { LearnerPathwayService } from '../learning/pathways-learner.js';
import { clearSessionCookie, readSessionToken } from '../lib/cookies.js';

export async function registerLearningRoutes(
  app: FastifyInstance,
  deps: {
    config: ApiConfig;
    auth: AuthService;
    learnerPathways: LearnerPathwayService;
    learnerChallenges: LearnerChallengeService;
  },
): Promise<void> {
  const { config, auth, learnerPathways, learnerChallenges } = deps;

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

  app.get('/challenges', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }
    const list = await learnerChallenges.listPublished();
    return { challenges: list };
  });

  app.get('/challenges/attempts', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }
    const attempts = await learnerChallenges.listAttempts(user.id);
    return { attempts };
  });

  app.post('/challenges/:challengeId/attempts', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }
    const { challengeId } = request.params as { challengeId: string };
    const attempt = await learnerChallenges.startAttempt(user.id, challengeId);
    request.log.info(
      { event: 'learning.challenge_started', challengeId, attemptId: attempt.id },
      'challenge attempt started',
    );
    return { attempt };
  });

  app.post('/challenges/attempts/:attemptId/complete', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }
    const { attemptId } = request.params as { attemptId: string };
    const attempt = await learnerChallenges.completeAttempt(user.id, attemptId);
    request.log.info(
      { event: 'learning.challenge_completed', attemptId, challengeId: attempt.challengeId },
      'challenge attempt completed',
    );
    return { attempt };
  });
}
