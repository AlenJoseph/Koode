/**
 * E2-S3 independent suite: admin pathways CRUD (create/list/update/archive).
 */
import { createDatabase, pathways, users } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E2-S3 admin pathways', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  beforeEach(async () => {
    await database.db.delete(pathways);
    await database.db.delete(users).where(eq(users.role, 'admin'));
  });

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function adminCookie(app: Awaited<ReturnType<typeof buildApp>>): Promise<string> {
    const email = `admin-path-${randomUUID()}@example.com`;
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

  it('happy: admin creates, lists, updates, and archives a pathway', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const cookie = await adminCookie(app);

    const created = await app.inject({
      method: 'POST',
      url: '/admin/pathways',
      headers: { cookie },
      payload: { title: 'Rainfall basics', summary: 'Water cycle intro', locale: 'en' },
    });
    expect(created.statusCode).toBe(200);
    const { pathway } = created.json() as {
      pathway: { id: string; title: string; status: string; locale: string };
    };
    expect(pathway).toMatchObject({
      title: 'Rainfall basics',
      summary: 'Water cycle intro',
      locale: 'en',
      status: 'draft',
    });

    const listed = await app.inject({
      method: 'GET',
      url: '/admin/pathways',
      headers: { cookie },
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toMatchObject({
      pathways: [expect.objectContaining({ id: pathway.id, title: 'Rainfall basics' })],
    });

    const updated = await app.inject({
      method: 'PATCH',
      url: `/admin/pathways/${pathway.id}`,
      headers: { cookie },
      payload: { title: 'Rainfall pathway', status: 'published' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      pathway: { id: pathway.id, title: 'Rainfall pathway', status: 'published' },
    });

    const archived = await app.inject({
      method: 'POST',
      url: `/admin/pathways/${pathway.id}/archive`,
      headers: { cookie },
    });
    expect(archived.statusCode).toBe(200);
    expect(archived.json()).toMatchObject({
      pathway: { id: pathway.id, status: 'archived' },
    });

    const afterArchive = await app.inject({
      method: 'GET',
      url: '/admin/pathways',
      headers: { cookie },
    });
    expect(afterArchive.json()).toMatchObject({ pathways: [] });

    const withArchived = await app.inject({
      method: 'GET',
      url: '/admin/pathways?includeArchived=1',
      headers: { cookie },
    });
    expect(withArchived.json()).toMatchObject({
      pathways: [expect.objectContaining({ id: pathway.id, status: 'archived' })],
    });

    await app.close();
  });

  it('negative: teacher gets 403; empty title rejected', async () => {
    const app = await buildApp({ config, database, disableLogger: true });

    const teacherEmail = `teacher-path-${randomUUID()}@example.com`;
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
      url: '/admin/pathways',
      headers: { cookie: teacherCookie },
      payload: { title: 'Nope' },
    });
    expect(forbidden.statusCode).toBe(403);

    const cookie = await adminCookie(app);
    const bad = await app.inject({
      method: 'POST',
      url: '/admin/pathways',
      headers: { cookie },
      payload: { title: '   ' },
    });
    expect(bad.statusCode).toBe(400);

    await app.close();
  });
});
