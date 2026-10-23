import { describe, expect, it } from 'vitest';
import { resolveRetentionDays } from './purge-tutor-turns.js';

describe('E9-S3 tutor turn retention', () => {
  it('defaults to 365 days', () => {
    expect(resolveRetentionDays({})).toBe(365);
  });

  it('reads TUTOR_TURN_RETENTION_DAYS', () => {
    expect(resolveRetentionDays({ TUTOR_TURN_RETENTION_DAYS: '90' })).toBe(90);
  });

  it('falls back on invalid values', () => {
    expect(resolveRetentionDays({ TUTOR_TURN_RETENTION_DAYS: 'nope' })).toBe(365);
    expect(resolveRetentionDays({ TUTOR_TURN_RETENTION_DAYS: '0' })).toBe(365);
  });
});
