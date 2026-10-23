/**
 * E3-S3 independent suite: learner project stub linked to pathway/challenge.
 */
import { challenges, createDatabase, pathways, projects, users } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E3-S3 project stub', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  beforeEach(async () => {
    await database.db.delete(projects);
    await database.db.delete(challenges);
    await database.db.delete(pathways);
    await database.db.delete(users).where(eq(users.role, 'admin'));
  });

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function cookieFor(
    app: Awaited<ReturnType<typeof buildApp>>,
    intent: 'admin' | 'learner',
  ): Promise<string> {
    const email = `${intent}-e3s3-${randomUUID()}@example.com`;
    if (intent === 'admin') {
      const bootstrap = await app.inject({
        method: 'POST',
        url: '/admin/bootstrap',
        payload: { email, bootstrapSecret: config.bootstrapSecret },
      });
      const { devToken } = bootstrap.json() as { devToken: string };
      const verify = await app.inject({
        method: 'POST',
        url: '/auth/magic-link/verify',
        payload: { token: devToken },
      });
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
    const setCookie = verify.headers['set-cookie'];
    return String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;
  }

  it('happy: learner creates and updates a project linked to pathway+challenge', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const admin = await cookieFor(app, 'admin');

    const pathwayRes = await app.inject({
      method: 'POST',
      url: '/admin/pathways',
      headers: { cookie: admin },
      payload: { title: 'Project pathway', locale: 'en' },
    });
    const pathwayId = (pathwayRes.json() as { pathway: { id: string } }).pathway.id;

    const challengeRes = await app.inject({
      method: 'POST',
      url: '/admin/challenges',
      headers: { cookie: admin },
      payload: { title: 'Project challenge', locale: 'en', pathwayId },
    });
    const challengeId = (challengeRes.json() as { challenge: { id: string } }).challenge.id;

    const learner = await cookieFor(app, 'learner');
    const created = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie: learner },
      payload: {
        title: 'My rainfall project',
        summary: 'First draft',
        pathwayId,
        challengeId,
      },
    });
    expect(created.statusCode).toBe(200);
    const projectId = (created.json() as { project: { id: string } }).project.id;
    expect(created.json()).toMatchObject({
      project: {
        title: 'My rainfall project',
        summary: 'First draft',
        pathwayId,
        challengeId,
      },
    });

    const updated = await app.inject({
      method: 'PATCH',
      url: `/projects/${projectId}`,
      headers: { cookie: learner },
      payload: { title: 'Rainfall project v2', summary: 'Revised' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      project: { id: projectId, title: 'Rainfall project v2', summary: 'Revised' },
    });

    const listed = await app.inject({
      method: 'GET',
      url: '/projects',
      headers: { cookie: learner },
    });
    expect(listed.json()).toMatchObject({
      projects: [expect.objectContaining({ id: projectId, title: 'Rainfall project v2' })],
    });

    await app.close();
  });

  it('negative: anonymous 401; empty title 400', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const anon = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { title: 'Nope' },
    });
    expect(anon.statusCode).toBe(401);

    const learner = await cookieFor(app, 'learner');
    const bad = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie: learner },
      payload: { title: '  ' },
    });
    expect(bad.statusCode).toBe(400);

    await app.close();
  });
});
