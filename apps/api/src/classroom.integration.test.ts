import { createDatabase } from '@koode/database';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('classroom integration', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function signInTeacher(app: Awaited<ReturnType<typeof buildApp>>, email: string) {
    const requestLink = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email },
    });
    const { devToken } = requestLink.json() as { devToken: string };
    const verify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });
    const setCookie = verify.headers['set-cookie'];
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    return String(cookie).split(';')[0]!;
  }

  it('lets a teacher create a section, add a student, and student sign in with secret words', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const teacherCookie = await signInTeacher(app, `teacher-${Date.now()}@example.com`);

    const createSection = await app.inject({
      method: 'POST',
      url: '/classroom/sections',
      headers: { cookie: teacherCookie },
      payload: { name: 'Class 7A' },
    });
    expect(createSection.statusCode).toBe(200);
    const section = (createSection.json() as { section: { id: string; code: string } }).section;
    expect(section.code).toMatch(/^[A-Z2-9]{6}$/);

    const addStudent = await app.inject({
      method: 'POST',
      url: `/classroom/sections/${section.id}/students`,
      headers: { cookie: teacherCookie },
      payload: { displayName: 'Ananya' },
    });
    expect(addStudent.statusCode).toBe(200);
    const student = (addStudent.json() as { student: { displayName: string; secretWords: string } })
      .student;
    expect(student.secretWords.split(' ')).toHaveLength(2);

    const lookup = await app.inject({
      method: 'GET',
      url: `/classroom/join/${section.code}`,
    });
    expect(lookup.statusCode).toBe(200);
    expect(lookup.json()).toMatchObject({
      section: {
        code: section.code,
        students: [{ displayName: 'Ananya' }],
      },
    });

    const signIn = await app.inject({
      method: 'POST',
      url: '/classroom/student/sign-in',
      payload: {
        code: section.code,
        displayName: 'Ananya',
        secretWords: student.secretWords,
      },
    });
    expect(signIn.statusCode).toBe(200);
    expect(signIn.json()).toMatchObject({
      ok: true,
      user: { role: 'student', displayName: 'Ananya', email: null },
    });

    const bad = await app.inject({
      method: 'POST',
      url: '/classroom/student/sign-in',
      payload: {
        code: section.code,
        displayName: 'Ananya',
        secretWords: 'WRONG WORDS',
      },
    });
    expect(bad.statusCode).toBe(401);

    await app.close();
  });
});
