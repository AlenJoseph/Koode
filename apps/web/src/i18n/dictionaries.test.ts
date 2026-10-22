import { describe, expect, it } from 'vitest';
import { getDictionary, t } from './dictionaries.js';

describe('web dictionaries', () => {
  it('loads English and Malayalam shell copy', () => {
    expect(t('en', 'app.name')).toBe('Koode');
    expect(t('ml', 'app.name')).toBe('കൂടെ');
    expect(getDictionary('en')['auth.sendLink']).toContain('magic');
    expect(getDictionary('ml')['nav.signIn']).toBe('സൈൻ ഇൻ');
  });
});
