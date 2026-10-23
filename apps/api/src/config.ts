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
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  rateLimitMagicLinkMax: number;
  rateLimitMagicLinkWindowMs: number;
  rateLimitTutorMax: number;
  rateLimitTutorWindowMs: number;
  /** Required to call first-run admin bootstrap. Empty = bootstrap disabled. */
  bootstrapSecret: string;
  /** How long tutor evidence rows should be kept (purge job later). See docs/privacy.md. */
  tutorTurnRetentionDays: number;
};

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  return value === 'true' || value === '1';
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
  const logLevel = (env.LOG_LEVEL ?? (isProduction ? 'info' : 'info')) as ApiConfig['logLevel'];

  return {
    port: Number(env.API_PORT ?? env.PORT ?? 3001),
    databaseUrl,
    sessionSecret,
    appOrigin: env.APP_ORIGIN ?? 'http://localhost:3000',
    magicLinkDevMode: parseBool(env.MAGIC_LINK_DEV_MODE, false),
    cookieSecure: parseBool(env.COOKIE_SECURE, isProduction),
    sessionTtlMs: 1000 * 60 * 60 * 24 * 14,
    magicLinkTtlMs: 1000 * 60 * 15,
    cookieName: 'koode_session',
    logLevel,
    rateLimitMagicLinkMax: parsePositiveInt(env.RATE_LIMIT_MAGIC_LINK_MAX, 10),
    rateLimitMagicLinkWindowMs: parsePositiveInt(env.RATE_LIMIT_MAGIC_LINK_WINDOW_MS, 15 * 60_000),
    rateLimitTutorMax: parsePositiveInt(env.RATE_LIMIT_TUTOR_MAX, 60),
    rateLimitTutorWindowMs: parsePositiveInt(env.RATE_LIMIT_TUTOR_WINDOW_MS, 60_000),
    bootstrapSecret: env.BOOTSTRAP_SECRET ?? '',
    tutorTurnRetentionDays: parsePositiveInt(env.TUTOR_TURN_RETENTION_DAYS, 365),
  };
}
