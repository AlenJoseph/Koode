/**
 * E4-S3 independent suite: teacher resets secret words; old fail; new shown once.
 */
import { createDatabase } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E4-S3 reset secret words', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  it('happy: reset invalidates old words and returns new ones once', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `teacher-rs-${randomUUID()}@example.com`;
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
      payload: { name: 'Secret lab' },
    });
    const section = (createSection.json() as { section: { id: string; code: string } }).section;

    const add = await app.inject({
      method: 'POST',
      url: `/classroom/sections/${section.id}/students`,
      headers: { cookie },
      payload: { displayName: 'Meera' },
    });
    const student = (
      add.json() as { student: { id: string; secretWords: string } }
    ).student;
    const oldWords = student.secretWords;

    const reset = await app.inject({
      method: 'POST',
      url: `/classroom/sections/${section.id}/students/${student.id}/reset-secret`,
      headers: { cookie },
    });
    expect(reset.statusCode).toBe(200);
    const newWords = (reset.json() as { student: { secretWords: string } }).student.secretWords;
    expect(newWords).toBeTruthy();
    expect(newWords).not.toBe(oldWords);
    expect(newWords.split(' ')).toHaveLength(2);

    const oldFails = await app.inject({
      method: 'POST',
      url: '/classroom/student/sign-in',
      payload: {
        code: section.code,
        displayName: 'Meera',
        secretWords: oldWords,
      },
    });
    expect(oldFails.statusCode).toBe(401);

    const newWorks = await app.inject({
      method: 'POST',
      url: '/classroom/student/sign-in',
      payload: {
        code: section.code,
        displayName: 'Meera',
        secretWords: newWords,
      },
    });
    expect(newWorks.statusCode).toBe(200);

    await app.close();
  });
});
