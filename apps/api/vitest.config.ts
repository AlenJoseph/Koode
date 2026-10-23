import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

function loadEnvFile(path: string): void {
  try {
    const raw = readFileSync(path, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq);
      const value = trimmed.slice(eq + 1);
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env is optional for unit-only runs
  }
}

loadEnvFile(resolve(__dirname, '../../.env'));

export default defineConfig({
  test: {
    name: 'api',
    include: ['src/**/*.test.ts'],
    // Shared Postgres — avoid cross-file races on emails/roles.
    fileParallelism: false,
  },
});

