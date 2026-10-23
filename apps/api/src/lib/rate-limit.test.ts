import { describe, expect, it } from 'vitest';
import { createMemoryRateLimiter } from './rate-limit.js';

describe('createMemoryRateLimiter', () => {
  it('allows up to max requests in a window', () => {
    const limiter = createMemoryRateLimiter({ windowMs: 60_000, max: 2 });
    expect(limiter.check('ip:1').ok).toBe(true);
    expect(limiter.check('ip:1').ok).toBe(true);
    expect(limiter.check('ip:1').ok).toBe(false);
  });

  it('isolates keys', () => {
    const limiter = createMemoryRateLimiter({ windowMs: 60_000, max: 1 });
    expect(limiter.check('a').ok).toBe(true);
    expect(limiter.check('b').ok).toBe(true);
    expect(limiter.check('a').ok).toBe(false);
  });
});
