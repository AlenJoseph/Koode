import { describe, expect, it } from 'vitest';
import { createOpaqueToken, hashToken, signCookieValue, verifyCookieValue } from './crypto.js';

describe('crypto helpers', () => {
  it('hashes tokens deterministically', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('abcd'));
  });

  it('signs and verifies cookie values', () => {
    const signed = signCookieValue('session-id', 'secret-secret-secret-secret-1234');
    expect(verifyCookieValue(signed, 'secret-secret-secret-secret-1234')).toBe('session-id');
    expect(verifyCookieValue(signed, 'other-secret-other-secret-other')).toBeNull();
  });

  it('creates opaque tokens', () => {
    expect(createOpaqueToken().length).toBeGreaterThan(20);
  });
});
