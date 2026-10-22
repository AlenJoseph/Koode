import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_LOCALE,
  isLocale,
  messageKeys,
  type Locale,
  type MessageKey,
} from '@koode/contracts';

const localesRoot = join(dirname(fileURLToPath(import.meta.url)), '../locales');

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

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  en: loadCatalog('en'),
  ml: loadCatalog('ml'),
};

export function resolveLocale(value: string | null | undefined): Locale {
  if (value && isLocale(value)) {
    return value;
  }
  return DEFAULT_LOCALE;
}

export function t(locale: Locale, key: MessageKey): string {
  return catalogs[locale][key];
}

export function shellCopy(locale: Locale): Record<MessageKey, string> {
  return { ...catalogs[locale] };
}
