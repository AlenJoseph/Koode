/**
 * E7-S2 independent suite: admin export/delete learner (GDPR-minded stub).
 */
import { createDatabase, users } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E7-S2 admin learner export/delete', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  beforeEach(async () => {
    await database.db.delete(users).where(eq(users.role, 'admin'));
  });

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function adminCookie(app: Awaited<ReturnType<typeof buildApp>>): Promise<string> {
    const email = `admin-gdpr-${randomUUID()}@example.com`;
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
    return String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;
  }

  async function createLearner(
    app: Awaited<ReturnType<typeof buildApp>>,
  ): Promise<{ userId: string; email: string; cookie: string }> {
    const email = `learner-gdpr-${randomUUID()}@example.com`;
    const requested = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email, intent: 'learner', ageConfirmed: true },
    });
    expect(requested.statusCode).toBe(200);
    const { devToken } = requested.json() as { devToken: string };
    const verify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });
    expect(verify.statusCode).toBe(200);
    const setCookie = verify.headers['set-cookie'];
    const cookie = String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;
    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    const { user } = me.json() as { user: { id: string } };
    return { userId: user.id, email, cookie };
  }

  it('happy: admin exports then deletes a learner', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const cookie = await adminCookie(app);
    const learner = await createLearner(app);

    const exported = await app.inject({
      method: 'GET',
      url: `/admin/learners/${learner.userId}/export`,
      headers: { cookie },
    });
    expect(exported.statusCode).toBe(200);
    const payload = exported.json() as {
      user: { id: string; role: string };
      emails: Array<{ email: string }>;
      counts: Record<string, number>;
      tutorTurnMetadata: unknown[];
    };
    expect(payload.user).toMatchObject({ id: learner.userId, role: 'learner' });
    expect(payload.emails.map((e) => e.email)).toContain(learner.email);
    expect(payload.counts).toMatchObject({
      pathwayEnrollments: expect.any(Number),
      challengeAttempts: expect.any(Number),
      projects: expect.any(Number),
      tutorTurns: expect.any(Number),
    });
    expect(JSON.stringify(payload)).not.toMatch(/learnerMessage|secretWords|password/i);

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/admin/learners/${learner.userId}`,
      headers: { cookie },
    });
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json()).toMatchObject({ deletedUserId: learner.userId, role: 'learner' });

    const again = await app.inject({
      method: 'GET',
      url: `/admin/learners/${learner.userId}/export`,
      headers: { cookie },
    });
    expect(again.statusCode).toBe(404);

    await app.close();
  });

  it('negative: teacher 403; cannot delete admin; unauthenticated 401', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const admin = await adminCookie(app);
    const learner = await createLearner(app);

    const teacherEmail = `teacher-gdpr-${randomUUID()}@example.com`;
    const teacherLink = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email: teacherEmail, intent: 'teacher' },
    });
    const { devToken } = teacherLink.json() as { devToken: string };
    const teacherVerify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });
    const setCookie = teacherVerify.headers['set-cookie'];
    const teacherCookie = String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;

    const asTeacher = await app.inject({
      method: 'GET',
      url: `/admin/learners/${learner.userId}/export`,
      headers: { cookie: teacherCookie },
    });
    expect(asTeacher.statusCode).toBe(403);

    const noAuth = await app.inject({
      method: 'DELETE',
      url: `/admin/learners/${learner.userId}`,
    });
    expect(noAuth.statusCode).toBe(401);

    const adminMe = await app.inject({
      method: 'GET',
      url: '/admin/me',
      headers: { cookie: admin },
    });
    const { user: adminUser } = adminMe.json() as { user: { id: string } };
    const deleteAdmin = await app.inject({
      method: 'DELETE',
      url: `/admin/learners/${adminUser.id}`,
      headers: { cookie: admin },
    });
    expect(deleteAdmin.statusCode).toBe(403);

    await app.close();
  });
});
