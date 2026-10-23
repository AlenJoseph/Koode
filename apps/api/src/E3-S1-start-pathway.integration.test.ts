/**
 * E3-S1 independent suite: learner browses published pathways and enrolls.
 */
import { createDatabase, pathwayEnrollments, pathways, users } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E3-S1 start pathway', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  beforeEach(async () => {
    await database.db.delete(pathwayEnrollments);
    await database.db.delete(pathways);
    await database.db.delete(users).where(eq(users.role, 'admin'));
  });

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function cookieFor(
    app: Awaited<ReturnType<typeof buildApp>>,
    email: string,
    intent: 'learner' | 'admin',
  ): Promise<string> {
    if (intent === 'admin') {
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
    expect(verify.statusCode).toBe(200);
    const setCookie = verify.headers['set-cookie'];
    return String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;
  }

  it('happy: learner lists published pathways and enrolls (idempotent)', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const adminCookie = await cookieFor(app, `admin-e3s1-${randomUUID()}@example.com`, 'admin');

    const draft = await app.inject({
      method: 'POST',
      url: '/admin/pathways',
      headers: { cookie: adminCookie },
      payload: { title: 'Draft only', summary: '', locale: 'en' },
    });
    expect(draft.statusCode).toBe(200);

    const published = await app.inject({
      method: 'POST',
      url: '/admin/pathways',
      headers: { cookie: adminCookie },
      payload: { title: 'Published path', summary: 'Go', locale: 'en' },
    });
    const pathwayId = (published.json() as { pathway: { id: string } }).pathway.id;
    await app.inject({
      method: 'PATCH',
      url: `/admin/pathways/${pathwayId}`,
      headers: { cookie: adminCookie },
      payload: { status: 'published' },
    });

    const learnerCookie = await cookieFor(
      app,
      `learner-e3s1-${randomUUID()}@example.com`,
      'learner',
    );

    const list = await app.inject({
      method: 'GET',
      url: '/pathways',
      headers: { cookie: learnerCookie },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({
      pathways: [expect.objectContaining({ id: pathwayId, title: 'Published path' })],
    });
    expect((list.json() as { pathways: unknown[] }).pathways).toHaveLength(1);

    const enroll = await app.inject({
      method: 'POST',
      url: `/pathways/${pathwayId}/enroll`,
      headers: { cookie: learnerCookie },
    });
    expect(enroll.statusCode).toBe(200);
    const enrollmentId = (enroll.json() as { enrollment: { id: string } }).enrollment.id;

    const again = await app.inject({
      method: 'POST',
      url: `/pathways/${pathwayId}/enroll`,
      headers: { cookie: learnerCookie },
    });
    expect(again.statusCode).toBe(200);
    expect(again.json()).toMatchObject({ enrollment: { id: enrollmentId } });

    const mine = await app.inject({
      method: 'GET',
      url: '/pathways/enrollments',
      headers: { cookie: learnerCookie },
    });
    expect(mine.json()).toMatchObject({
      enrollments: [expect.objectContaining({ pathwayId, status: 'active' })],
    });

    await app.close();
  });

  it('negative: anonymous 401; draft pathway enroll 404', async () => {
    const app = await buildApp({ config, database, disableLogger: true });

    const anon = await app.inject({ method: 'GET', url: '/pathways' });
    expect(anon.statusCode).toBe(401);

    const adminCookie = await cookieFor(app, `admin-e3s1b-${randomUUID()}@example.com`, 'admin');
    const draft = await app.inject({
      method: 'POST',
      url: '/admin/pathways',
      headers: { cookie: adminCookie },
      payload: { title: 'Still draft', summary: '', locale: 'en' },
    });
    const pathwayId = (draft.json() as { pathway: { id: string } }).pathway.id;

    const learnerCookie = await cookieFor(
      app,
      `learner-e3s1b-${randomUUID()}@example.com`,
      'learner',
    );
    const enroll = await app.inject({
      method: 'POST',
      url: `/pathways/${pathwayId}/enroll`,
      headers: { cookie: learnerCookie },
    });
    expect(enroll.statusCode).toBe(404);

    await app.close();
  });
});
