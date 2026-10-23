import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { createDatabase, type Database } from '@koode/database';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AuthError, createAuthService, type AuthService } from './auth/service.js';
import type { ApiConfig } from './config.js';
import { signCookieValue, verifyCookieValue } from './crypto.js';
import { getHealth } from './health.js';

export type AppDeps = {
  config: ApiConfig;
  database?: Database;
  auth?: AuthService;
};

declare module 'fastify' {
  interface FastifyRequest {
    sessionToken?: string;
  }
}

function readSessionToken(request: FastifyRequest, config: ApiConfig): string | null {
  const raw = request.cookies[config.cookieName];
  if (!raw) {
    return null;
  }
  return verifyCookieValue(raw, config.sessionSecret);
}

function sessionCookieOptions(config: ApiConfig) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.cookieSecure,
  };
}

function setSessionCookie(
  reply: FastifyReply,
  config: ApiConfig,
  sessionToken: string,
  expiresAt: Date,
): void {
  reply.setCookie(config.cookieName, signCookieValue(sessionToken, config.sessionSecret), {
    ...sessionCookieOptions(config),
    expires: expiresAt,
  });
}

function clearSessionCookie(reply: FastifyReply, config: ApiConfig): void {
  reply.clearCookie(config.cookieName, sessionCookieOptions(config));
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const database = deps.database ?? createDatabase(deps.config.databaseUrl);
  const auth = deps.auth ?? createAuthService(database, deps.config);
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: deps.config.appOrigin,
    credentials: true,
  });
  await app.register(cookie);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: 'invalid_request', details: error.flatten() });
    }
    if (error instanceof AuthError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    app.log.error(error);
    return reply.status(500).send({ error: 'internal_error' });
  });

  app.get('/health', async () => getHealth());

  app.post('/auth/magic-link/request', async (request) => {
    return auth.requestMagicLink(request.body);
  });

  app.post('/auth/magic-link/verify', async (request, reply) => {
    const result = await auth.verifyMagicLink(request.body);
    setSessionCookie(reply, deps.config, result.sessionToken, result.expiresAt);
    return { ok: true, user: result.user };
  });

  app.get('/auth/me', async (request, reply) => {
    const sessionToken = readSessionToken(request, deps.config);
    if (!sessionToken) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const user = await auth.getUserForSessionToken(sessionToken);
    if (!user) {
      clearSessionCookie(reply, deps.config);
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    return { user };
  });

  app.post('/auth/logout', async (request, reply) => {
    const sessionToken = readSessionToken(request, deps.config);
    if (sessionToken) {
      await auth.revokeSession(sessionToken);
    }
    clearSessionCookie(reply, deps.config);
    return { ok: true };
  });

  app.addHook('onClose', async () => {
    if (!deps.database) {
      await database.client.end({ timeout: 5 });
    }
  });

  return app;
}
