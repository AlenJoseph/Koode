/**
 * E4-S6 independent suite: teacher assigns pathway direction to a section.
 */
import { createDatabase, pathways, users } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E4-S6 section pathway direction', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  beforeEach(async () => {
    await database.db.delete(pathways);
    await database.db.delete(users).where(eq(users.role, 'admin'));
  });

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  it('happy: teacher attaches and replaces pathway guidance on a section', async () => {
    const app = await buildApp({ config, database, disableLogger: true });

    const adminEmail = `admin-dir-${randomUUID()}@example.com`;
    const bootstrap = await app.inject({
      method: 'POST',
      url: '/admin/bootstrap',
      payload: { email: adminEmail, bootstrapSecret: config.bootstrapSecret },
    });
    const { devToken: adminToken } = bootstrap.json() as { devToken: string };
    const adminVerify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: adminToken },
    });
    const adminCookie = String(
      Array.isArray(adminVerify.headers['set-cookie'])
        ? adminVerify.headers['set-cookie'][0]
        : adminVerify.headers['set-cookie'],
    ).split(';')[0]!;

    const pathwayA = await app.inject({
      method: 'POST',
      url: '/admin/pathways',
      headers: { cookie: adminCookie },
      payload: { title: 'Direction A', locale: 'en' },
    });
    const pathwayB = await app.inject({
      method: 'POST',
      url: '/admin/pathways',
      headers: { cookie: adminCookie },
      payload: { title: 'Direction B', locale: 'en' },
    });
    const idA = (pathwayA.json() as { pathway: { id: string } }).pathway.id;
    const idB = (pathwayB.json() as { pathway: { id: string } }).pathway.id;
    await app.inject({
      method: 'PATCH',
      url: `/admin/pathways/${idA}`,
      headers: { cookie: adminCookie },
      payload: { status: 'published' },
    });
    await app.inject({
      method: 'PATCH',
      url: `/admin/pathways/${idB}`,
      headers: { cookie: adminCookie },
      payload: { status: 'published' },
    });

    const teacherEmail = `teacher-dir-${randomUUID()}@example.com`;
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
    const cookie = String(
      Array.isArray(verify.headers['set-cookie'])
        ? verify.headers['set-cookie'][0]
        : verify.headers['set-cookie'],
    ).split(';')[0]!;

    const createSection = await app.inject({
      method: 'POST',
      url: '/classroom/sections',
      headers: { cookie },
      payload: { name: 'Guided class' },
    });
    const sectionId = (createSection.json() as { section: { id: string } }).section.id;

    const set = await app.inject({
      method: 'PUT',
      url: `/classroom/sections/${sectionId}/pathways`,
      headers: { cookie },
      payload: { pathwayIds: [idA, idB] },
    });
    expect(set.statusCode).toBe(200);
    expect(set.json()).toMatchObject({
      pathways: expect.arrayContaining([
        expect.objectContaining({ id: idA, title: 'Direction A' }),
        expect.objectContaining({ id: idB, title: 'Direction B' }),
      ]),
    });

    const replace = await app.inject({
      method: 'PUT',
      url: `/classroom/sections/${sectionId}/pathways`,
      headers: { cookie },
      payload: { pathwayIds: [idB] },
    });
    expect(replace.statusCode).toBe(200);
    expect(replace.json()).toMatchObject({
      pathways: [expect.objectContaining({ id: idB })],
    });
    expect((replace.json() as { pathways: unknown[] }).pathways).toHaveLength(1);

    await app.close();
  });
});
