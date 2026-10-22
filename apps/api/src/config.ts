export type ApiConfig = {
  port: number;
  databaseUrl: string;
  sessionSecret: string;
  appOrigin: string;
  magicLinkDevMode: boolean;
  sessionTtlMs: number;
  magicLinkTtlMs: number;
  cookieName: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const sessionSecret = env.SESSION_SECRET ?? 'dev-session-secret-change-me-32chars';
  if (sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters');
  }

  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  return {
    port: Number(env.API_PORT ?? env.PORT ?? 3001),
    databaseUrl,
    sessionSecret,
    appOrigin: env.APP_ORIGIN ?? 'http://localhost:3000',
    magicLinkDevMode: env.MAGIC_LINK_DEV_MODE !== 'false',
    sessionTtlMs: 1000 * 60 * 60 * 24 * 14,
    magicLinkTtlMs: 1000 * 60 * 15,
    cookieName: 'koode_session',
  };
}
