import { z } from 'zod';

/** Supported learner UI and tutor prompt locales. */
export const supportedLocales = ['en', 'ml'] as const;

export const localeSchema = z.enum(supportedLocales);

export type Locale = z.infer<typeof localeSchema>;

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return supportedLocales.includes(value as Locale);
}
