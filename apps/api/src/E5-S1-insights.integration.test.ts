/**
 * E5-S1 independent suite: learning-support aggregates API for a section.
 */
import { challengeAttempts, challenges, createDatabase } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E5-S1 learning-support insights', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  it('happy: returns strength/weakness/growth/helpNeeded from attempts', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `teacher-e5s1-${randomUUID()}@example.com`;
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
      payload: { name: 'Insights class' },
    });
    const sectionId = (createSection.json() as { section: { id: string } }).section.id;

    const addA = await app.inject({
      method: 'POST',
      url: `/classroom/sections/${sectionId}/students`,
      headers: { cookie },
      payload: { displayName: 'Asha' },
    });
    const addB = await app.inject({
      method: 'POST',
      url: `/classroom/sections/${sectionId}/students`,
      headers: { cookie },
      payload: { displayName: 'Biju' },
    });
    const ashaId = (addA.json() as { student: { userId: string } }).student.userId;
    const bijuId = (addB.json() as { student: { userId: string } }).student.userId;

    const [challenge] = await database.db
      .insert(challenges)
      .values({
        title: 'Loops',
        summary: 'Practice',
        status: 'published',
      })
      .returning();

    await database.db.insert(challengeAttempts).values([
      {
        userId: ashaId,
        challengeId: challenge!.id,
        status: 'completed',
        completedAt: new Date(),
      },
      {
        userId: ashaId,
        challengeId: challenge!.id,
        status: 'completed',
        completedAt: new Date(),
      },
      {
        userId: ashaId,
        challengeId: challenge!.id,
        status: 'completed',
        completedAt: new Date(),
      },
      {
        userId: bijuId,
        challengeId: challenge!.id,
        status: 'in_progress',
      },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: `/classroom/sections/${sectionId}/insights`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      insights: {
        sectionId: string;
        aggregates: {
          strength: number;
          weakness: number;
          growth: number;
          helpNeeded: number;
        };
        learners: Array<{ displayName: string; bucket: string }>;
        byChallenge: Array<{ title: string; completed: number; started: number }>;
      };
    };
    expect(body.insights.sectionId).toBe(sectionId);
    expect(body.insights.aggregates).toEqual({
      strength: 1,
      weakness: 0,
      growth: 0,
      helpNeeded: 1,
    });
    expect(body.insights.learners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ displayName: 'Asha', bucket: 'strength' }),
        expect.objectContaining({ displayName: 'Biju', bucket: 'help_needed' }),
      ]),
    );
    expect(body.insights.byChallenge).toEqual([
      expect.objectContaining({ title: 'Loops', started: 4, completed: 3 }),
    ]);

    await app.close();
  });

  it('negative: unauthenticated 401; non-owner section 404', async () => {
    const app = await buildApp({ config, database, disableLogger: true });

    const anon = await app.inject({
      method: 'GET',
      url: `/classroom/sections/${randomUUID()}/insights`,
    });
    expect(anon.statusCode).toBe(401);

    const email = `teacher-e5s1-neg-${randomUUID()}@example.com`;
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

    const missing = await app.inject({
      method: 'GET',
      url: `/classroom/sections/${randomUUID()}/insights`,
      headers: { cookie },
    });
    expect(missing.statusCode).toBe(404);

    await app.close();
  });
});
