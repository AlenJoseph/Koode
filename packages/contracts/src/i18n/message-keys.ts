/**
 * Canonical message keys for the learner app shell.
 * Every key must exist in apps/web/locales/{en,ml}/common.json.
 */
export const messageKeys = [
  'app.name',
  'app.tagline',
  'nav.home',
  'nav.challenges',
  'nav.progress',
  'locale.switch',
  'locale.en',
  'locale.ml',
  'health.ok',
] as const;

export type MessageKey = (typeof messageKeys)[number];
