/**
 * E5-S2 independent suite: R/O/G supportIndicator + non-clinical legend on insights API.
 */
import { createDatabase } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E5-S2 support indicator', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  it('happy: insights include supportIndicator and non-clinical legend', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `teacher-e5s2-${randomUUID()}@example.com`;
    const requestLink = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email, intent: 'teacher' },
    });
    const { devToken } = requestLink.json() as { devToken: string };
    const verify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });
    const setCookie = verify.headers['set-cookie'];
    const cookie = String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;

    const createSection = await app.inject({
      method: 'POST',
      url: '/classroom/sections',
      headers: { cookie },
      payload: { name: 'ROG class' },
    });
    const sectionId = (createSection.json() as { section: { id: string } }).section.id;

    await app.inject({
      method: 'POST',
      url: `/classroom/sections/${sectionId}/students`,
      headers: { cookie },
      payload: { displayName: 'Maya' },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/classroom/sections/${sectionId}/insights`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      insights: {
        supportLegend: string;
        learners: Array<{ displayName: string; supportIndicator: string }>;
      };
    };
    expect(body.insights.supportLegend.toLowerCase()).toContain('indicative');
    expect(body.insights.supportLegend.toLowerCase()).toContain('not a clinical diagnosis');
    expect(body.insights.learners[0]).toMatchObject({
      displayName: 'Maya',
      supportIndicator: 'red',
    });

    await app.close();
  });
});
