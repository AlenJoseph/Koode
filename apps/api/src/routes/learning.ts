import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { SessionUser } from '@koode/contracts';
import type { AuthService } from '../auth/service.js';
import type { ApiConfig } from '../config.js';
import type { ChallengeQuizService } from '../learning/challenge-quiz.js';
import type { EconomyService } from '../learning/economy.js';
import type { LearnerChallengeService } from '../learning/challenges-learner.js';
import type { LearnerPathwayService } from '../learning/pathways-learner.js';
import type { LearningEventsService } from '../learning/learning-events.js';
import type { LessonService } from '../learning/lesson.js';
import type { ProjectService } from '../learning/projects.js';
import { clearSessionCookie, readSessionToken } from '../lib/cookies.js';
import type { MemoryRateLimiter } from '../lib/rate-limit.js';

export async function registerLearningRoutes(
  app: FastifyInstance,
  deps: {
    config: ApiConfig;
    auth: AuthService;
    learnerPathways: LearnerPathwayService;
    learnerChallenges: LearnerChallengeService;
    challengeQuiz: ChallengeQuizService;
    projects: ProjectService;
    learningEvents: LearningEventsService;
    economy: EconomyService;
    lessons: LessonService;
    eventsLimiter: MemoryRateLimiter;
  },
): Promise<void> {
  const {
    config,
    auth,
    learnerPathways,
    learnerChallenges,
    challengeQuiz,
    projects,
    learningEvents,
    economy,
    lessons,
    eventsLimiter,
  } = deps;

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

  async function requireLearner(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<SessionUser | null> {
    const user = await requireUser(request, reply);
    if (!user) {
      return null;
    }
    auth.requireLearnerSide(user);
    return user;
  }

  /** Catalog browse — any authenticated role (teachers may peek). */
  app.get('/pathways', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }
    const list = await learnerPathways.listPublished();
    return { pathways: list };
  });

  app.get('/pathways/enrollments', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    const enrollments = await learnerPathways.listEnrollments(user.id);
    return { enrollments };
  });

  app.post('/pathways/:pathwayId/enroll', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    const { pathwayId } = request.params as { pathwayId: string };
    const enrollment = await learnerPathways.startEnrollment(user.id, pathwayId);
    await learningEvents.ingest(user.id, {
      events: [
        {
          eventId: randomUUID(),
          eventType: 'PATHWAY_ENROLLED',
          pathwayId,
          occurredAt: new Date().toISOString(),
          payload: { enrollment_id: enrollment.id },
        },
      ],
    });
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
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    const attempts = await learnerChallenges.listAttempts(user.id);
    return { attempts };
  });

  app.post('/challenges/:challengeId/attempts', async (request, reply) => {
    const user = await requireLearner(request, reply);
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
    const user = await requireLearner(request, reply);
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

  /** E9-S2 — quiz from content manuals (no correctOptionId until submit). */
  app.get('/challenges/:challengeId/quiz', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    const { challengeId } = request.params as { challengeId: string };
    const quiz = await challengeQuiz.getLearnerQuiz(challengeId);
    return { quiz };
  });

  app.post('/challenges/attempts/:attemptId/quiz', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    const { attemptId } = request.params as { attemptId: string };
    const result = await challengeQuiz.submitQuiz(user.id, attemptId, request.body);

    // Server-trusted graded events (client cannot forge correct:true/false for auto-help).
    const gradedIngest = await learningEvents.ingest(user.id, {
      events: result.items.map((item) => ({
        eventId: randomUUID(),
        eventType: 'QUIZ_ANSWERED' as const,
        pathwayId: result.pathwaySlug,
        contentId: result.contentSlug,
        stepId: result.stepId,
        occurredAt: new Date().toISOString(),
        payload: {
          question_id: item.quizItemId,
          correct: item.isCorrect,
          graded: true,
        },
      })),
    });

    // Award coins + certificate only when all answers correct (successCriteria proxy).
    let coins: { awarded: boolean; balance: number } | null = null;
    let certificate = null;
    if (result.passed) {
      try {
        const manual = await lessons.loadManualForEconomy(result.attempt.challengeId);
        const amount = manual.manual.coinReward ?? 15;
        const award = await economy.awardChallengeSuccess({
          userId: user.id,
          challengeId: result.attempt.challengeId,
          amount,
        });
        coins = { awarded: award.awarded, balance: award.balance };
        const cert = await economy.issueChallengeCertificate({
          userId: user.id,
          challengeId: result.attempt.challengeId,
          pathwayId: manual.pathwayId,
          title: `${manual.manual.title} — evidence`,
          evidenceSummary: manual.manual.successCriteria.join('; '),
        });
        certificate = cert.certificate;
      } catch {
        const award = await economy.awardChallengeSuccess({
          userId: user.id,
          challengeId: result.attempt.challengeId,
          amount: 15,
        });
        coins = { awarded: award.awarded, balance: award.balance };
      }
    }

    request.log.info(
      {
        event: 'learning.quiz_submitted',
        attemptId,
        challengeId: result.attempt.challengeId,
        correct: result.score.correct,
        total: result.score.total,
        passed: result.passed,
      },
      'challenge quiz submitted',
    );
    return { ...result, coins, certificate, nudge: gradedIngest.nudge };
  });

  app.get('/challenges/:challengeId/lesson', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    const { challengeId } = request.params as { challengeId: string };
    const lesson = await lessons.getLesson(user.id, challengeId);
    return { lesson };
  });

  app.put('/challenges/:challengeId/lesson/progress', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    const { challengeId } = request.params as { challengeId: string };
    const progress = await lessons.saveProgress(user.id, challengeId, request.body);
    return { progress };
  });

  app.get('/learning/config', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    return {
      autoHelpEnabled: config.autoHelpEnabled,
      autoHelpIdleMs: config.autoHelpIdleMs,
      autoHelpFailStreak: config.autoHelpFailStreak,
    };
  });

  app.post('/learning/events', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    const limit = eventsLimiter.check(`events:${user.id}`);
    if (!limit.ok) {
      reply.header('retry-after', String(limit.retryAfterSec));
      return reply.status(429).send({ error: 'rate_limited', retryAfterSec: limit.retryAfterSec });
    }
    const result = await learningEvents.ingest(user.id, request.body);
    request.log.info(
      {
        event: 'learning.events_ingested',
        accepted: result.accepted,
        duplicates: result.duplicates,
        nudge: result.nudge?.reason ?? null,
      },
      'learning events ingested',
    );
    return result;
  });

  app.get('/learning/events', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    const q = request.query as {
      pathwayId?: string;
      contentId?: string;
      stepId?: string;
      limit?: string;
    };
    const events = await learningEvents.listRecent(user.id, {
      pathwayId: q.pathwayId,
      contentId: q.contentId,
      stepId: q.stepId,
      limit: q.limit ? Number(q.limit) : 40,
    });
    return { events };
  });

  app.get('/learning/auto-help', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    const q = request.query as { contentId?: string; stepId?: string };
    return learningEvents.getAutoHelp(user.id, q);
  });

  app.get('/economy/balance', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    return economy.getBalance(user.id);
  });

  app.get('/economy/shop', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    const shop = economy.listShop();
    const redemptions = await economy.listRedemptions(user.id);
    return { ...shop, redeemedItemIds: redemptions.itemIds };
  });

  app.post('/economy/shop/redeem', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    return economy.redeem(user.id, request.body);
  });

  app.get('/economy/certificates', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    return economy.listCertificates(user.id);
  });

  app.get('/projects', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    const list = await projects.listForUser(user.id);
    return { projects: list };
  });

  app.post('/projects', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    const project = await projects.create(user.id, request.body);
    request.log.info({ event: 'learning.project_created', projectId: project.id }, 'project created');
    return { project };
  });

  app.patch('/projects/:projectId', async (request, reply) => {
    const user = await requireLearner(request, reply);
    if (!user) {
      return;
    }
    const { projectId } = request.params as { projectId: string };
    const project = await projects.update(user.id, projectId, request.body);
    request.log.info({ event: 'learning.project_updated', projectId }, 'project updated');
    return { project };
  });
}
