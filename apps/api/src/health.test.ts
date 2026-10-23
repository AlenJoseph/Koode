import { describe, expect, it } from 'vitest';
import { getHealth } from './health.js';

describe('getHealth', () => {
  it('reports a healthy API core', () => {
    expect(getHealth()).toEqual({
      ok: true,
      service: 'api',
      defaultLocale: 'en',
    });
  });
});
