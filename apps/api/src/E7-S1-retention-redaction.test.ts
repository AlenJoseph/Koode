/**
 * E7-S1: retention defaults + log redaction checklist (config / unit).
 */
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';
import { DEFAULT_TUTOR_TURN_RETENTION_DAYS, LOG_REDACT_PATHS } from './privacy/redaction.js';

const baseEnv = {
  DATABASE_URL: 'postgres://koode:koode@localhost:5433/koode',
  SESSION_SECRET: 'unit-test-session-secret-32chars!!',
};

describe('E7-S1 retention & redaction', () => {
  it('documents required log redact paths (privacy checklist)', () => {
    expect(LOG_REDACT_PATHS).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.email',
        'req.body.token',
        'req.body.learnerMessage',
        'req.body.devToken',
        'req.body.secretWords',
        'req.body.bootstrapSecret',
      ]),
    );
    expect(new Set(LOG_REDACT_PATHS).size).toBe(LOG_REDACT_PATHS.length);
  });

  it('defaults tutor turn retention to 365 days', () => {
    expect(DEFAULT_TUTOR_TURN_RETENTION_DAYS).toBe(365);
    expect(loadConfig(baseEnv).tutorTurnRetentionDays).toBe(365);
  });

  it('allows TUTOR_TURN_RETENTION_DAYS override', () => {
    expect(
      loadConfig({ ...baseEnv, TUTOR_TURN_RETENTION_DAYS: '90' }).tutorTurnRetentionDays,
    ).toBe(90);
  });

  it('keeps session and magic-link TTLs aligned with privacy.md', () => {
    const config = loadConfig(baseEnv);
    expect(config.sessionTtlMs).toBe(1000 * 60 * 60 * 24 * 14);
    expect(config.magicLinkTtlMs).toBe(1000 * 60 * 15);
  });
});
