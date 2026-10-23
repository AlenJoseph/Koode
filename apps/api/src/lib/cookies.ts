import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ApiConfig } from '../config.js';
import { signCookieValue, verifyCookieValue } from '../crypto.js';

export function readSessionToken(request: FastifyRequest, config: ApiConfig): string | null {
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

export function setSessionCookie(
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

export function clearSessionCookie(reply: FastifyReply, config: ApiConfig): void {
  reply.clearCookie(config.cookieName, sessionCookieOptions(config));
}
