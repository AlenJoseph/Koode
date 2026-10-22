import { describe, expect, it } from 'vitest';
import { getHealth } from './health.js';

describe('getHealth', () => {
  it('reports a healthy foundation API', () => {
    expect(getHealth()).toEqual({
      ok: true,
      service: 'api',
      defaultLocale: 'en',
    });
  });
});
