/**
 * E4-S4 independent suite: archived sections are not joinable; teacher still lists them.
 */
import { createDatabase } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E4-S4 archive section', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  it('happy: archive hides join; teacher still sees section history', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `teacher-arch-${randomUUID()}@example.com`;
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
      payload: { name: 'Archive me' },
    });
    const section = (createSection.json() as { section: { id: string; code: string } }).section;

    const add = await app.inject({
      method: 'POST',
      url: `/classroom/sections/${section.id}/students`,
      headers: { cookie },
      payload: { displayName: 'Dev' },
    });
    const secretWords = (add.json() as { student: { secretWords: string } }).student.secretWords;

    const archived = await app.inject({
      method: 'POST',
      url: `/classroom/sections/${section.id}/archive`,
      headers: { cookie },
    });
    expect(archived.statusCode).toBe(200);
    expect(archived.json()).toMatchObject({
      section: { id: section.id, archivedAt: expect.any(String) },
    });

    const list = await app.inject({
      method: 'GET',
      url: '/classroom/sections',
      headers: { cookie },
    });
    expect(list.json()).toMatchObject({
      sections: [
        expect.objectContaining({
          id: section.id,
          name: 'Archive me',
          archivedAt: expect.any(String),
        }),
      ],
    });

    const roster = await app.inject({
      method: 'GET',
      url: `/classroom/sections/${section.id}/roster`,
      headers: { cookie },
    });
    expect(roster.statusCode).toBe(200);
    expect(roster.json()).toMatchObject({
      roster: [expect.objectContaining({ displayName: 'Dev' })],
    });

    const join = await app.inject({
      method: 'GET',
      url: `/classroom/join/${section.code}`,
    });
    expect(join.statusCode).toBe(404);

    const signIn = await app.inject({
      method: 'POST',
      url: '/classroom/student/sign-in',
      payload: {
        code: section.code,
        displayName: 'Dev',
        secretWords,
      },
    });
    expect(signIn.statusCode).toBe(404);

    await app.close();
  });
});
