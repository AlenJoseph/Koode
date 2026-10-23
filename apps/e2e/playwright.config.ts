import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRootEnv } from './load-env.js';

loadRootEnv();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const appOrigin = process.env.APP_ORIGIN ?? 'http://localhost:3000';
const apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:3001';

const sharedEnv = {
  ...process.env,
  APP_ORIGIN: appOrigin,
  API_ORIGIN: apiOrigin,
  NEXT_PUBLIC_API_URL: apiOrigin,
  MAGIC_LINK_DEV_MODE: process.env.MAGIC_LINK_DEV_MODE ?? 'true',
  COOKIE_SECURE: process.env.COOKIE_SECURE ?? 'false',
  AI_PROVIDER: process.env.AI_PROVIDER ?? 'stub',
  // Full e2e suite issues many magic-link verifies from one IP; keep abuse protection high enough for CI.
  RATE_LIMIT_MAGIC_LINK_MAX: process.env.RATE_LIMIT_MAGIC_LINK_MAX ?? '100',
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: appOrigin,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @koode/api start',
      cwd: root,
      url: `${apiOrigin}/health`,
      reuseExistingServer: process.env.PW_REUSE === '1',
      timeout: 120_000,
      env: sharedEnv,
    },
    {
      command: 'pnpm --filter @koode/web start',
      cwd: root,
      url: appOrigin,
      reuseExistingServer: process.env.PW_REUSE === '1',
      timeout: 120_000,
      env: sharedEnv,
    },
  ],
});
