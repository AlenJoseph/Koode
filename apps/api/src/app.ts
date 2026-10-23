import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { TutorRuntimeError, createTutorRuntime, type TutorRuntime } from '@koode/agent-runtime';
import { createGatewayFromEnv, type AiGateway } from '@koode/ai-gateway';
import { createDatabase, type Database } from '@koode/database';
import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AuthError, createAuthService, type AuthService } from './auth/service.js';
import { createClassroomService, type ClassroomService } from './classroom/service.js';
import type { ApiConfig } from './config.js';
import { createMemoryRateLimiter, type MemoryRateLimiter } from './lib/rate-limit.js';
import { createLearnerChallengeService } from './learning/challenges-learner.js';
import { createLearnerPathwayService } from './learning/pathways-learner.js';
import { createProjectService } from './learning/projects.js';
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
  magicLinkLimiter?: MemoryRateLimiter;
  tutorLimiter?: MemoryRateLimiter;
  studentSignInLimiter?: MemoryRateLimiter;
  disableLogger?: boolean;
};

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const database = deps.database ?? createDatabase(deps.config.databaseUrl);
  const auth = deps.auth ?? createAuthService(database, deps.config);
  const classroom = deps.classroom ?? createClassroomService(database);
  const gateway = deps.gateway ?? createGatewayFromEnv();
  const tutorRuntime = deps.tutor ?? createTutorRuntime(gateway);
  const tutorService = deps.tutorService ?? createTutorService(database, tutorRuntime);
  const magicLinkLimiter =
    deps.magicLinkLimiter ??
    createMemoryRateLimiter({
      windowMs: deps.config.rateLimitMagicLinkWindowMs,
      max: deps.config.rateLimitMagicLinkMax,
    });
  const tutorLimiter =
    deps.tutorLimiter ??
    createMemoryRateLimiter({
      windowMs: deps.config.rateLimitTutorWindowMs,
      max: deps.config.rateLimitTutorMax,
    });
  const studentSignInLimiter =
    deps.studentSignInLimiter ??
    createMemoryRateLimiter({
      windowMs: deps.config.rateLimitMagicLinkWindowMs,
      max: deps.config.rateLimitMagicLinkMax,
    });

  const app = Fastify({
    logger: deps.disableLogger
      ? false
      : {
          level: deps.config.logLevel,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.email',
              'req.body.token',
              'req.body.learnerMessage',
              'req.body.devToken',
              'req.body.secretWords',
              'req.body.bootstrapSecret',
            ],
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
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  await app.register(cookie);

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
    request.log.error({ err: error }, 'unhandled error');
    return reply.status(500).send({ error: 'internal_error' });
  });

  await registerHealthRoutes(app, gateway);
  await registerAuthRoutes(app, { config: deps.config, auth, magicLinkLimiter });
  await registerAdminRoutes(app, { config: deps.config, auth, database });
  await registerLearningRoutes(app, {
    config: deps.config,
    auth,
    learnerPathways: createLearnerPathwayService(database),
    learnerChallenges: createLearnerChallengeService(database),
    projects: createProjectService(database),
  });
  await registerClassroomRoutes(app, {
    config: deps.config,
    auth,
    classroom,
    studentSignInLimiter,
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
