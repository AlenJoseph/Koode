import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import {
  TutorRuntimeError,
  createContentLoader,
  createTutorRuntime,
  type TutorRuntime,
} from '@koode/agent-runtime';
import { createGatewayFromEnv, type AiGateway } from '@koode/ai-gateway';
import { createDatabase, type Database } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AuthError, createAuthService, type AuthService } from './auth/service.js';
import { createClassroomService, type ClassroomService } from './classroom/service.js';
import type { ApiConfig } from './config.js';
import { createMemoryRateLimiter, type MemoryRateLimiter } from './lib/rate-limit.js';
import { createInsightsService } from './insights/service.js';
import { createChallengeQuizService } from './learning/challenge-quiz.js';
import { createLearnerChallengeService } from './learning/challenges-learner.js';
import { createEconomyService } from './learning/economy.js';
import { createLearnerPathwayService } from './learning/pathways-learner.js';
import { createLearningEventsService } from './learning/learning-events.js';
import { createLessonService } from './learning/lesson.js';
import { createProjectService } from './learning/projects.js';
import { DEFAULT_AUTO_HELP_CONFIG } from './learning/auto-help-rules.js';
import { LOG_REDACT_PATHS } from './privacy/redaction.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerClassroomRoutes } from './routes/classroom.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerLearningRoutes } from './routes/learning.js';
import { registerTutorRoutes } from './routes/tutor.js';
import { createTutorService, type TutorService } from './tutor/service.js';


export type AppDeps = {
  config: ApiConfig;
  database?: Database;
  auth?: AuthService;
  classroom?: ClassroomService;
  gateway?: AiGateway;
  tutor?: TutorRuntime;
  tutorService?: TutorService;
  tutorLimiter?: MemoryRateLimiter;
  disableLogger?: boolean;
};

function resolveContentRoot(): string | null {
  const fromEnv = process.env.CONTENT_ROOT;
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }
  const repoContent = join(dirname(fileURLToPath(import.meta.url)), '../../../content');
  return existsSync(repoContent) ? repoContent : null;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const database = deps.database ?? createDatabase(deps.config.databaseUrl);
  const auth = deps.auth ?? createAuthService(database, deps.config);
  const classroom = deps.classroom ?? createClassroomService(database);
  const gateway = deps.gateway ?? createGatewayFromEnv();
  const contentRoot = resolveContentRoot();
  const tutorRuntime =
    deps.tutor ??
    createTutorRuntime(
      gateway,
      contentRoot ? { contentLoader: createContentLoader({ contentRoot }) } : {},
    );
  const tutorService = deps.tutorService ?? createTutorService(database, tutorRuntime);
  const tutorLimiter =
    deps.tutorLimiter ??
    createMemoryRateLimiter({
      windowMs: deps.config.rateLimitTutorWindowMs,
      max: deps.config.rateLimitTutorMax,
    });
  const eventsLimiter = createMemoryRateLimiter({
    windowMs: deps.config.rateLimitEventsWindowMs,
    max: deps.config.rateLimitEventsMax,
  });

  const app = Fastify({
    logger: deps.disableLogger
      ? false
      : {
          level: deps.config.logLevel,
          redact: {
            paths: [...LOG_REDACT_PATHS],
            remove: true,
          },
        },

    genReqId: (request) => {
      const incoming = request.headers['x-request-id'];
      if (typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 128) {
        return incoming;
      }
      return randomUUID();
    },
    requestIdHeader: 'x-request-id',
  });

  await app.register(cors, {
    origin: deps.config.appOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: false,
    max: deps.config.rateLimitMagicLinkMax,
    timeWindow: deps.config.rateLimitMagicLinkWindowMs,
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'rate_limited',
      retryAfterSec: Math.ceil(context.ttl / 1000),
    }),
  });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: 'invalid_request', details: error.flatten() });
    }
    if (error instanceof AuthError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    if (error instanceof TutorRuntimeError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof (error as { statusCode?: unknown }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : undefined;
    if (statusCode === 429) {
      const payload =
        typeof error === 'object' &&
        error !== null &&
        'error' in error &&
        typeof (error as { error?: unknown }).error === 'string'
          ? {
              error: (error as { error: string }).error,
              ...('retryAfterSec' in error
                ? { retryAfterSec: (error as { retryAfterSec?: number }).retryAfterSec }
                : {}),
            }
          : { error: 'rate_limited' };
      return reply.status(429).send(payload);
    }
    request.log.error({ err: error }, 'unhandled error');
    return reply.status(500).send({ error: 'internal_error' });
  });

  await registerHealthRoutes(app, gateway);
  await registerAuthRoutes(app, { config: deps.config, auth });
  await registerAdminRoutes(app, { config: deps.config, auth, database });
  const contentLoader = contentRoot ? createContentLoader({ contentRoot }) : null;
  await registerLearningRoutes(app, {
    config: deps.config,
    auth,
    learnerPathways: createLearnerPathwayService(database),
    learnerChallenges: createLearnerChallengeService(database),
    challengeQuiz: createChallengeQuizService(database, contentLoader),
    projects: createProjectService(database),
    learningEvents: createLearningEventsService(database, {
      ...DEFAULT_AUTO_HELP_CONFIG,
      enabled: deps.config.autoHelpEnabled,
      failStreakThreshold: deps.config.autoHelpFailStreak,
      idleMs: deps.config.autoHelpIdleMs,
    }),
    economy: createEconomyService(database),
    lessons: createLessonService(database, contentLoader),
    eventsLimiter,
  });
  await registerClassroomRoutes(app, {
    config: deps.config,
    auth,
    classroom,
    insights: createInsightsService(database, classroom),
  });
  await registerTutorRoutes(app, {
    config: deps.config,
    auth,
    tutorService,
    adapterId: gateway.adapterId,
    tutorLimiter,
  });

  app.addHook('onClose', async () => {
    if (!deps.database) {
      await database.client.end({ timeout: 5 });
    }
  });

  return app;
}
