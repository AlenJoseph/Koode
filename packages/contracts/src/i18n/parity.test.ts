import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { messageKeys } from './message-keys.js';
import { assertLocaleParity, findLocaleParityIssues, type LocaleCatalog } from './parity.js';
import { supportedLocales, type Locale } from './locales.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

function loadCatalog(locale: Locale): LocaleCatalog {
  const path = join(root, 'apps/web/locales', locale, 'common.json');
  return JSON.parse(readFileSync(path, 'utf8')) as LocaleCatalog;
}

function loadAllCatalogs(): Record<Locale, LocaleCatalog> {
  return {
    en: loadCatalog('en'),
    ml: loadCatalog('ml'),
  };
}

describe('locale parity', () => {
  it('keeps en and ml catalogs in parity with canonical keys', () => {
    const catalogs = loadAllCatalogs();
    expect(findLocaleParityIssues(catalogs)).toEqual([]);
    expect(() => assertLocaleParity(catalogs)).not.toThrow();
  });

  it('detects a missing key', () => {
    const catalogs = loadAllCatalogs();
    const broken = { ...catalogs.en };
    delete broken['app.name'];
    const issues = findLocaleParityIssues({ ...catalogs, en: broken });
    expect(issues).toContainEqual({
      type: 'missing_key',
      locale: 'en',
      key: 'app.name',
    });
  });

  it('detects an orphan key', () => {
    const catalogs = loadAllCatalogs();
    const issues = findLocaleParityIssues({
      ...catalogs,
      ml: { ...catalogs.ml, 'extra.key': 'bonus' },
    });
    expect(issues).toContainEqual({
      type: 'orphan_key',
      locale: 'ml',
      key: 'extra.key',
    });
  });

  it('lists the same keys the catalogs must implement', () => {
    expect(messageKeys.length).toBeGreaterThan(0);
    expect(supportedLocales).toEqual(['en', 'ml']);
  });
});
