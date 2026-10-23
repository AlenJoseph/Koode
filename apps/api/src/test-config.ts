import type { ApiConfig } from './config.js';

/** Shared API config for integration tests. */
export function testConfig(databaseUrl: string): ApiConfig {
  return {
    port: 0,
    databaseUrl,
    sessionSecret: 'ci-session-secret-at-least-32-chars-long',
    appOrigin: 'http://localhost:3000',
    magicLinkDevMode: true,
    cookieSecure: false,
    sessionTtlMs: 1000 * 60 * 60,
    magicLinkTtlMs: 1000 * 60 * 15,
    cookieName: 'koode_session',
    logLevel: 'silent',
    rateLimitMagicLinkMax: 1000,
    rateLimitMagicLinkWindowMs: 60_000,
    rateLimitTutorMax: 1000,
    rateLimitTutorWindowMs: 60_000,
    bootstrapSecret: 'test-bootstrap-secret-16+',
  };
}
