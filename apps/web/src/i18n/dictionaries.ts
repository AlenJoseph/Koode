import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  messageKeys,
  type Locale,
  type MessageKey,
  supportedLocales,
} from '@koode/contracts';

const localesRoot = join(dirname(fileURLToPath(import.meta.url)), '../../locales');

function loadCatalog(locale: Locale): Record<MessageKey, string> {
  const raw = JSON.parse(
    readFileSync(join(localesRoot, locale, 'common.json'), 'utf8'),
  ) as Record<string, string>;

  const catalog = {} as Record<MessageKey, string>;
  for (const key of messageKeys) {
    const value = raw[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Missing translation for ${locale}.${key}`);
    }
    catalog[key] = value;
  }
  return catalog;
}

const catalogs = Object.fromEntries(
  supportedLocales.map((locale) => [locale, loadCatalog(locale)]),
) as Record<Locale, Record<MessageKey, string>>;

export function getDictionary(locale: Locale): Record<MessageKey, string> {
  return catalogs[locale];
}

export function t(locale: Locale, key: MessageKey): string {
  return catalogs[locale][key];
}
