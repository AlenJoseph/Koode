/**
 * E1-S4 independent suite: classroom student claims email onto same account.
 */
import { createDatabase } from '@koode/database';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E1-S4 claim email', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function teacherCookie(app: Awaited<ReturnType<typeof buildApp>>, email: string) {
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
    return String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;
  }

  it('happy: student claims email then learner magic-link returns same user id', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const stamp = Date.now();
    const cookie = await teacherCookie(app, `claim-t-${stamp}@example.com`);

    const sectionRes = await app.inject({
      method: 'POST',
      url: '/classroom/sections',
      headers: { cookie },
      payload: { name: `Claim Class ${stamp}` },
    });
    const section = (sectionRes.json() as { section: { id: string; code: string } }).section;

    const add = await app.inject({
      method: 'POST',
      url: `/classroom/sections/${section.id}/students`,
      headers: { cookie },
      payload: { displayName: `ClaimKid ${stamp}` },
    });
    const student = (
      add.json() as { student: { userId: string; displayName: string; secretWords: string } }
    ).student;

    const join = await app.inject({
      method: 'POST',
      url: '/classroom/student/sign-in',
      payload: {
        code: section.code,
        displayName: student.displayName,
        secretWords: student.secretWords,
      },
    });
    expect(join.statusCode).toBe(200);
    const studentCookie = String(
      Array.isArray(join.headers['set-cookie'])
        ? join.headers['set-cookie'][0]
        : join.headers['set-cookie'],
    ).split(';')[0]!;
    const beforeId = (join.json() as { user: { id: string } }).user.id;
    expect(beforeId).toBe(student.userId);

    const claimEmail = `claimed-${stamp}@example.com`;
    const claimReq = await app.inject({
      method: 'POST',
      url: '/auth/emails/claim/request',
      headers: { cookie: studentCookie },
      payload: { email: claimEmail },
    });
    expect(claimReq.statusCode).toBe(200);
    const { devToken } = claimReq.json() as { devToken: string };

    const claimVerify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });
    expect(claimVerify.statusCode).toBe(200);
    expect(claimVerify.json()).toMatchObject({
      user: { id: beforeId, email: claimEmail, role: 'student' },
    });

    const later = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email: claimEmail, intent: 'learner' },
    });
    const laterToken = (later.json() as { devToken: string }).devToken;
    const laterVerify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: laterToken },
    });
    expect(laterVerify.statusCode).toBe(200);
    expect(laterVerify.json()).toMatchObject({
      user: {
        id: beforeId,
        email: claimEmail,
        role: 'student',
        displayName: student.displayName,
        sectionId: section.id,
      },
    });

    await app.close();
  });


  it('negative: unauthenticated claim is rejected; duplicate email across users fails', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const stamp = Date.now();

    const anon = await app.inject({
      method: 'POST',
      url: '/auth/emails/claim/request',
      payload: { email: `anon-${stamp}@example.com` },
    });
    expect(anon.statusCode).toBe(401);

    const teacher = await teacherCookie(app, `owner-${stamp}@example.com`);
    // teacher already has owner email; another user cannot claim it
    const cookie = await teacherCookie(app, `other-t-${stamp}@example.com`);
    const sectionRes = await app.inject({
      method: 'POST',
      url: '/classroom/sections',
      headers: { cookie },
      payload: { name: `Dup ${stamp}` },
    });
    const section = (sectionRes.json() as { section: { id: string; code: string } }).section;
    const add = await app.inject({
      method: 'POST',
      url: `/classroom/sections/${section.id}/students`,
      headers: { cookie },
      payload: { displayName: `DupKid ${stamp}` },
    });
    const student = (
      add.json() as { student: { displayName: string; secretWords: string } }
    ).student;
    const join = await app.inject({
      method: 'POST',
      url: '/classroom/student/sign-in',
      payload: {
        code: section.code,
        displayName: student.displayName,
        secretWords: student.secretWords,
      },
    });
    const studentCookie = String(
      Array.isArray(join.headers['set-cookie'])
        ? join.headers['set-cookie'][0]
        : join.headers['set-cookie'],
    ).split(';')[0]!;

    const clash = await app.inject({
      method: 'POST',
      url: '/auth/emails/claim/request',
      headers: { cookie: studentCookie },
      payload: { email: `owner-${stamp}@example.com` },
    });
    expect(clash.statusCode).toBe(409);

    // silence unused
    expect(teacher).toBeTruthy();
    await app.close();
  });
});
