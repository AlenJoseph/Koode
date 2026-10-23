/**
 * E3-S2 independent suite: start/complete challenge attempts (stub success).
 */
import { challengeAttempts, challenges, createDatabase, users } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E3-S2 challenge attempt', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  beforeEach(async () => {
    await database.db.delete(challengeAttempts);
    await database.db.delete(challenges);
    await database.db.delete(users).where(eq(users.role, 'admin'));
  });

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function adminCookie(app: Awaited<ReturnType<typeof buildApp>>): Promise<string> {
    const email = `admin-e3s2-${randomUUID()}@example.com`;
    const bootstrap = await app.inject({
      method: 'POST',
      url: '/admin/bootstrap',
      payload: { email, bootstrapSecret: config.bootstrapSecret },
    });
    const { devToken } = bootstrap.json() as { devToken: string };
    const verify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });
    const setCookie = verify.headers['set-cookie'];
    return String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;
  }

  async function learnerCookie(app: Awaited<ReturnType<typeof buildApp>>): Promise<string> {
    const email = `learner-e3s2-${randomUUID()}@example.com`;
    const requestLink = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email, intent: 'learner' },
    });
    const { devToken } = requestLink.json() as { devToken: string };
    const verify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });
    const setCookie = verify.headers['set-cookie'];
    return String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;
  }

  it('happy: learner starts and completes a published challenge', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const admin = await adminCookie(app);
    const created = await app.inject({
      method: 'POST',
      url: '/admin/challenges',
      headers: { cookie: admin },
      payload: { title: 'Stub challenge', summary: 'Do it', locale: 'en' },
    });
    const challengeId = (created.json() as { challenge: { id: string } }).challenge.id;
    await app.inject({
      method: 'PATCH',
      url: `/admin/challenges/${challengeId}`,
      headers: { cookie: admin },
      payload: { status: 'published' },
    });

    const learner = await learnerCookie(app);
    const list = await app.inject({
      method: 'GET',
      url: '/challenges',
      headers: { cookie: learner },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({
      challenges: [expect.objectContaining({ id: challengeId })],
    });

    const started = await app.inject({
      method: 'POST',
      url: `/challenges/${challengeId}/attempts`,
      headers: { cookie: learner },
    });
    expect(started.statusCode).toBe(200);
    const attemptId = (started.json() as { attempt: { id: string; status: string } }).attempt.id;
    expect(started.json()).toMatchObject({ attempt: { status: 'in_progress' } });

    const completed = await app.inject({
      method: 'POST',
      url: `/challenges/attempts/${attemptId}/complete`,
      headers: { cookie: learner },
    });
    expect(completed.statusCode).toBe(200);
    expect(completed.json()).toMatchObject({
      attempt: { id: attemptId, status: 'completed' },
    });

    await app.close();
  });

  it('negative: unauthenticated 401; draft challenge 404', async () => {
    const app = await buildApp({ config, database, disableLogger: true });

    const anon = await app.inject({ method: 'GET', url: '/challenges' });
    expect(anon.statusCode).toBe(401);

    const anonStart = await app.inject({
      method: 'POST',
      url: `/challenges/${randomUUID()}/attempts`,
    });
    expect(anonStart.statusCode).toBe(401);

    const admin = await adminCookie(app);
    const draft = await app.inject({
      method: 'POST',
      url: '/admin/challenges',
      headers: { cookie: admin },
      payload: { title: 'Draft challenge', locale: 'en' },
    });
    const challengeId = (draft.json() as { challenge: { id: string } }).challenge.id;

    const learner = await learnerCookie(app);
    const start = await app.inject({
      method: 'POST',
      url: `/challenges/${challengeId}/attempts`,
      headers: { cookie: learner },
    });
    expect(start.statusCode).toBe(404);

    await app.close();
  });
});
