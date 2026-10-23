/**
 * E1-S3 independent suite: teacher ≠ learner email isolation.
 * Happy (allowed same-role re-entry) + negative cross-role attempts.
 */
import { createDatabase } from '@koode/database';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E1-S3 role isolation', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function magicVerify(
    app: Awaited<ReturnType<typeof buildApp>>,
    email: string,
    intent: 'teacher' | 'learner',
  ) {
    const requestLink = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: {
        email,
        intent,
        ...(intent === 'learner' ? { ageConfirmed: true } : {}),
      },
    });
    const { devToken } = requestLink.json() as { devToken: string };
    return app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });
  }

  it('negative: learner email cannot become teacher via magic-link', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `iso-learner-${Date.now()}@example.com`;

    const asLearner = await magicVerify(app, email, 'learner');
    expect(asLearner.statusCode).toBe(200);
    expect(asLearner.json()).toMatchObject({ user: { role: 'learner' } });

    const asTeacher = await magicVerify(app, email, 'teacher');
    expect(asTeacher.statusCode).toBe(403);
    expect(String((asTeacher.json() as { error?: string }).error ?? asTeacher.body)).toMatch(
      /learner|student/i,
    );

    await app.close();
  });

  it('negative: teacher email cannot sign up as learner', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `iso-teacher-${Date.now()}@example.com`;

    const asTeacher = await magicVerify(app, email, 'teacher');
    expect(asTeacher.statusCode).toBe(200);
    expect(asTeacher.json()).toMatchObject({ user: { role: 'teacher' } });

    const asLearner = await magicVerify(app, email, 'learner');
    expect(asLearner.statusCode).toBe(403);
    expect(String((asLearner.json() as { error?: string }).error ?? asLearner.body)).toMatch(
      /teacher/i,
    );

    await app.close();
  });

  it('happy: same-role re-entry still works', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const learnerEmail = `iso-ok-l-${Date.now()}@example.com`;
    const teacherEmail = `iso-ok-t-${Date.now()}@example.com`;

    const l1 = await magicVerify(app, learnerEmail, 'learner');
    const l2 = await magicVerify(app, learnerEmail, 'learner');
    expect(l1.statusCode).toBe(200);
    expect(l2.statusCode).toBe(200);
    expect((l2.json() as { user: { id: string } }).user.id).toBe(
      (l1.json() as { user: { id: string } }).user.id,
    );

    const t1 = await magicVerify(app, teacherEmail, 'teacher');
    const t2 = await magicVerify(app, teacherEmail, 'teacher');
    expect(t1.statusCode).toBe(200);
    expect(t2.statusCode).toBe(200);
    expect((t2.json() as { user: { id: string } }).user.id).toBe(
      (t1.json() as { user: { id: string } }).user.id,
    );

    await app.close();
  });
});
