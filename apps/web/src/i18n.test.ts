import { describe, expect, it } from 'vitest';
import { resolveLocale, shellCopy, t } from './i18n.js';

describe('web i18n', () => {
  it('defaults unknown locales to en', () => {
    expect(resolveLocale(undefined)).toBe('en');
    expect(resolveLocale('fr')).toBe('en');
  });

  it('resolves supported locales', () => {
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('ml')).toBe('ml');
  });

  it('returns English and Malayalam shell copy', () => {
    expect(t('en', 'app.name')).toBe('Koode');
    expect(t('ml', 'app.name')).toBe('കൂടെ');
    expect(shellCopy('en')['app.tagline']).toContain('Grow');
    expect(shellCopy('ml')['nav.home']).toBe('ഹോം');
  });
});
