import { messageKeys, type MessageKey } from './message-keys.js';
import { supportedLocales, type Locale } from './locales.js';

export type LocaleCatalog = Record<string, string>;

export type ParityIssue =
  | { type: 'missing_key'; locale: Locale; key: MessageKey }
  | { type: 'orphan_key'; locale: Locale; key: string }
  | { type: 'empty_value'; locale: Locale; key: MessageKey };

/**
 * Compare locale catalogs against the canonical message key list.
 * Fails closed: missing, orphan, or empty values are reported.
 */
export function findLocaleParityIssues(
  catalogs: Record<Locale, LocaleCatalog>,
): ParityIssue[] {
  const issues: ParityIssue[] = [];
  const required = new Set<string>(messageKeys);

  for (const locale of supportedLocales) {
    const catalog = catalogs[locale] ?? {};
    const present = new Set(Object.keys(catalog));

    for (const key of messageKeys) {
      if (!present.has(key)) {
        issues.push({ type: 'missing_key', locale, key });
        continue;
      }
      const value = catalog[key];
      if (typeof value !== 'string' || value.trim().length === 0) {
        issues.push({ type: 'empty_value', locale, key });
      }
    }

    for (const key of present) {
      if (!required.has(key)) {
        issues.push({ type: 'orphan_key', locale, key });
      }
    }
  }

  return issues;
}

export function assertLocaleParity(catalogs: Record<Locale, LocaleCatalog>): void {
  const issues = findLocaleParityIssues(catalogs);
  if (issues.length > 0) {
    const summary = issues
      .map((issue) => {
        if (issue.type === 'orphan_key') {
          return `${issue.locale}: orphan "${issue.key}"`;
        }
        return `${issue.locale}: ${issue.type} "${issue.key}"`;
      })
      .join('; ');
    throw new Error(`Locale parity failed: ${summary}`);
  }
}
