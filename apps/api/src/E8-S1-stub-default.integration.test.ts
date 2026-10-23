/**
 * E8-S1 / demo hardening: CI and local default AI provider remains stub.
 */
import { createDatabase } from '@koode/database';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E8-S1 stub remains default', () => {
  const previous = process.env.AI_PROVIDER;
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  afterAll(async () => {
    if (previous === undefined) {
      delete process.env.AI_PROVIDER;
    } else {
      process.env.AI_PROVIDER = previous;
    }
    await database.client.end({ timeout: 5 });
  });

  it('health reports stub when AI_PROVIDER is unset', async () => {
    delete process.env.AI_PROVIDER;
    const app = await buildApp({ config, database, disableLogger: true });
    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ ok: true, aiAdapter: 'stub' });
    await app.close();
  });
});
