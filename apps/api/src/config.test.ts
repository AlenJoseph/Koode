import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const baseEnv = {
  DATABASE_URL: 'postgres://koode:koode@localhost:5433/koode',
  SESSION_SECRET: 'unit-test-session-secret-32chars!!',
};

describe('loadConfig', () => {
  it('requires SESSION_SECRET', () => {
    expect(() => loadConfig({ DATABASE_URL: baseEnv.DATABASE_URL })).toThrow(/SESSION_SECRET/);
  });

  it('requires DATABASE_URL', () => {
    expect(() => loadConfig({ SESSION_SECRET: baseEnv.SESSION_SECRET })).toThrow(/DATABASE_URL/);
  });

  it('defaults magic-link dev mode to false', () => {
    expect(loadConfig(baseEnv).magicLinkDevMode).toBe(false);
  });

  it('enables magic-link dev mode only when explicitly true', () => {
    expect(loadConfig({ ...baseEnv, MAGIC_LINK_DEV_MODE: 'true' }).magicLinkDevMode).toBe(true);
    expect(loadConfig({ ...baseEnv, MAGIC_LINK_DEV_MODE: 'false' }).magicLinkDevMode).toBe(false);
  });

  it('defaults cookieSecure from NODE_ENV and COOKIE_SECURE', () => {
    expect(loadConfig(baseEnv).cookieSecure).toBe(false);
    expect(loadConfig({ ...baseEnv, NODE_ENV: 'production' }).cookieSecure).toBe(true);
    expect(loadConfig({ ...baseEnv, NODE_ENV: 'production', COOKIE_SECURE: 'false' }).cookieSecure).toBe(
      false,
    );
    expect(loadConfig({ ...baseEnv, COOKIE_SECURE: 'true' }).cookieSecure).toBe(true);
  });

  it('loads rate-limit defaults', () => {
    const config = loadConfig(baseEnv);
    expect(config.rateLimitMagicLinkMax).toBe(10);
    expect(config.rateLimitTutorMax).toBe(60);
  });

  it('defaults bootstrap secret to empty (disabled)', () => {
    expect(loadConfig(baseEnv).bootstrapSecret).toBe('');
    expect(loadConfig({ ...baseEnv, BOOTSTRAP_SECRET: 'dev-bootstrap-secret-16' }).bootstrapSecret).toBe(
      'dev-bootstrap-secret-16',
    );
  });
});

