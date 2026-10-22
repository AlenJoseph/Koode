import { DEFAULT_LOCALE, type Locale } from '@koode/contracts';

export type HealthStatus = {
  ok: true;
  service: 'api';
  defaultLocale: Locale;
};

export function getHealth(): HealthStatus {
  return {
    ok: true,
    service: 'api',
    defaultLocale: DEFAULT_LOCALE,
  };
}
