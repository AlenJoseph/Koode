/**
 * E2-S4 independent suite: admin challenges CRUD with optional pathway link.
 */
import { challenges, createDatabase, pathways, users } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E2-S4 admin challenges', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  beforeEach(async () => {
    await database.db.delete(challenges);
    await database.db.delete(pathways);
    await database.db.delete(users).where(eq(users.role, 'admin'));
  });

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function adminCookie(app: Awaited<ReturnType<typeof buildApp>>): Promise<string> {
    const email = `admin-chal-${randomUUID()}@example.com`;
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

  it('happy: admin creates challenge linked to pathway, updates, archives', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const cookie = await adminCookie(app);

    const pathwayRes = await app.inject({
      method: 'POST',
      url: '/admin/pathways',
      headers: { cookie },
      payload: { title: 'Parent pathway', summary: '', locale: 'en' },
    });
    expect(pathwayRes.statusCode).toBe(200);
    const pathwayId = (pathwayRes.json() as { pathway: { id: string } }).pathway.id;

    const created = await app.inject({
      method: 'POST',
      url: '/admin/challenges',
      headers: { cookie },
      payload: {
        title: 'Measure rainfall',
        summary: 'Collect data',
        locale: 'en',
        pathwayId,
      },
    });
    expect(created.statusCode).toBe(200);
    const { challenge } = created.json() as {
      challenge: { id: string; title: string; pathwayId: string | null; status: string };
    };
    expect(challenge).toMatchObject({
      title: 'Measure rainfall',
      pathwayId,
      status: 'draft',
    });

    const listed = await app.inject({
      method: 'GET',
      url: '/admin/challenges',
      headers: { cookie },
    });
    expect(listed.json()).toMatchObject({
      challenges: [expect.objectContaining({ id: challenge.id, pathwayId })],
    });

    const updated = await app.inject({
      method: 'PATCH',
      url: `/admin/challenges/${challenge.id}`,
      headers: { cookie },
      payload: { status: 'published', pathwayId: null },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      challenge: { id: challenge.id, status: 'published', pathwayId: null },
    });

    const archived = await app.inject({
      method: 'POST',
      url: `/admin/challenges/${challenge.id}/archive`,
      headers: { cookie },
    });
    expect(archived.statusCode).toBe(200);
    expect(archived.json()).toMatchObject({ challenge: { status: 'archived' } });

    await app.close();
  });

  it('negative: teacher 403; unknown pathway 404; empty title 400', async () => {
    const app = await buildApp({ config, database, disableLogger: true });

    const teacherEmail = `teacher-chal-${randomUUID()}@example.com`;
    const requestLink = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email: teacherEmail, intent: 'teacher' },
    });
    const { devToken } = requestLink.json() as { devToken: string };
    const verify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });
    const setCookie = verify.headers['set-cookie'];
    const teacherCookie = String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;

    const forbidden = await app.inject({
      method: 'POST',
      url: '/admin/challenges',
      headers: { cookie: teacherCookie },
      payload: { title: 'Nope' },
    });
    expect(forbidden.statusCode).toBe(403);

    const cookie = await adminCookie(app);
    const missingPathway = await app.inject({
      method: 'POST',
      url: '/admin/challenges',
      headers: { cookie },
      payload: { title: 'Orphan', pathwayId: randomUUID() },
    });
    expect(missingPathway.statusCode).toBe(404);

    const bad = await app.inject({
      method: 'POST',
      url: '/admin/challenges',
      headers: { cookie },
      payload: { title: '  ' },
    });
    expect(bad.statusCode).toBe(400);

    await app.close();
  });
});
