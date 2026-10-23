export type ApiConfig = {
  port: number;
  databaseUrl: string;
  sessionSecret: string;
  appOrigin: string;
  magicLinkDevMode: boolean;
  cookieSecure: boolean;
  sessionTtlMs: number;
  magicLinkTtlMs: number;
  cookieName: string;
};

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  return value === 'true' || value === '1';
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const sessionSecret = env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error('SESSION_SECRET is required');
  }
  if (sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters');
  }

  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const isProduction = env.NODE_ENV === 'production';

  return {
    port: Number(env.API_PORT ?? env.PORT ?? 3001),
    databaseUrl,
    sessionSecret,
    appOrigin: env.APP_ORIGIN ?? 'http://localhost:3000',
    // Fail closed: only enable token leakage when explicitly opted in.
    magicLinkDevMode: parseBool(env.MAGIC_LINK_DEV_MODE, false),
    // HTTPS deployments must set COOKIE_SECURE=true (default on in production).
    cookieSecure: parseBool(env.COOKIE_SECURE, isProduction),
    sessionTtlMs: 1000 * 60 * 60 * 24 * 14,
    magicLinkTtlMs: 1000 * 60 * 15,
    cookieName: 'koode_session',
  };
}
