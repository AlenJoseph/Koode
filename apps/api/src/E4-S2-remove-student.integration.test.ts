/**
 * E4-S2 independent suite: remove student membership; account remains; old secrets fail.
 */
import { createDatabase, users } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E4-S2 remove student', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  it('happy: remove membership keeps user; old secret cannot sign in until re-added', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `teacher-rm-${randomUUID()}@example.com`;
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
      payload: { name: 'Remove lab' },
    });
    const section = (createSection.json() as { section: { id: string; code: string } }).section;

    const add = await app.inject({
      method: 'POST',
      url: `/classroom/sections/${section.id}/students`,
      headers: { cookie },
      payload: { displayName: 'Riya' },
    });
    expect(add.statusCode).toBe(200);
    const student = (
      add.json() as { student: { id: string; userId: string; secretWords: string } }
    ).student;

    const removed = await app.inject({
      method: 'DELETE',
      url: `/classroom/sections/${section.id}/students/${student.id}`,
      headers: { cookie },
    });
    expect(removed.statusCode).toBe(200);

    const userRow = await database.db.query.users.findFirst({
      where: eq(users.id, student.userId),
    });
    expect(userRow).toBeTruthy();

    const blocked = await app.inject({
      method: 'POST',
      url: '/classroom/student/sign-in',
      payload: {
        code: section.code,
        displayName: 'Riya',
        secretWords: student.secretWords,
      },
    });
    expect(blocked.statusCode).toBe(401);

    const readd = await app.inject({
      method: 'POST',
      url: `/classroom/sections/${section.id}/students`,
      headers: { cookie },
      payload: { displayName: 'Riya' },
    });
    expect(readd.statusCode).toBe(200);
    const revived = (readd.json() as { student: { userId: string; secretWords: string } }).student;
    expect(revived.userId).toBe(student.userId);
    const newSecret = revived.secretWords;

    const oldStillFails = await app.inject({
      method: 'POST',
      url: '/classroom/student/sign-in',
      payload: {
        code: section.code,
        displayName: 'Riya',
        secretWords: student.secretWords,
      },
    });
    expect(oldStillFails.statusCode).toBe(401);

    const newWorks = await app.inject({
      method: 'POST',
      url: '/classroom/student/sign-in',
      payload: {
        code: section.code,
        displayName: 'Riya',
        secretWords: newSecret,
      },
    });
    expect(newWorks.statusCode).toBe(200);

    await app.close();
  });
});
