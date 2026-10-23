/**
 * E2-S2 independent suite: only role=admin may hit protected /admin/* routes.
 */
import { createDatabase, users } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E2-S2 admin authz', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  beforeEach(async () => {
    await database.db.delete(users).where(eq(users.role, 'admin'));
  });

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function sessionCookie(
    app: Awaited<ReturnType<typeof buildApp>>,
    email: string,
    intent: 'teacher' | 'learner' | 'admin',
  ): Promise<string> {
    const requestLink = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: {
        email,
        intent,
        ...(intent === 'learner' ? { ageConfirmed: true } : {}),
      },
    });
    expect(requestLink.statusCode).toBe(200);
    const { devToken } = requestLink.json() as { devToken: string };
    const verify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });
    expect(verify.statusCode).toBe(200);
    const setCookie = verify.headers['set-cookie'];
    return String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;
  }

  it('happy: admin can GET /admin/me', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `admin-authz-${randomUUID()}@example.com`;

    const bootstrap = await app.inject({
      method: 'POST',
      url: '/admin/bootstrap',
      payload: { email, bootstrapSecret: config.bootstrapSecret },
    });
    expect(bootstrap.statusCode).toBe(200);
    const { devToken } = bootstrap.json() as { devToken: string };

    const verify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });
    expect(verify.statusCode).toBe(200);
    const setCookie = verify.headers['set-cookie'];
    const cookie = String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;

    const me = await app.inject({
      method: 'GET',
      url: '/admin/me',
      headers: { cookie },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ user: { email, role: 'admin' } });

    await app.close();
  });

  it('negative: teacher and learner get 403; anonymous gets 401', async () => {
    const app = await buildApp({ config, database, disableLogger: true });

    const anon = await app.inject({ method: 'GET', url: '/admin/me' });
    expect(anon.statusCode).toBe(401);

    const teacherCookie = await sessionCookie(
      app,
      `teacher-authz-${randomUUID()}@example.com`,
      'teacher',
    );
    const teacher = await app.inject({
      method: 'GET',
      url: '/admin/me',
      headers: { cookie: teacherCookie },
    });
    expect(teacher.statusCode).toBe(403);

    const learnerCookie = await sessionCookie(
      app,
      `learner-authz-${randomUUID()}@example.com`,
      'learner',
    );
    const learner = await app.inject({
      method: 'GET',
      url: '/admin/me',
      headers: { cookie: learnerCookie },
    });
    expect(learner.statusCode).toBe(403);

    // Bootstrap status stays public.
    const status = await app.inject({ method: 'GET', url: '/admin/bootstrap/status' });
    expect(status.statusCode).toBe(200);

    await app.close();
  });
});
