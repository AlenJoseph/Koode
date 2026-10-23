/**
 * E3-S5 independent suite: tutor accepts optional pathway/challenge context;
 * teachers cannot see another learner's tutor turns.
 */
import { createTutorRuntime } from '@koode/agent-runtime';
import { createAiGateway, createStubAdapter } from '@koode/ai-gateway';
import { challenges, createDatabase, pathways, tutorTurns, users } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E3-S5 tutor context', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);
  const gateway = createAiGateway({
    adapter: createStubAdapter({
      content: JSON.stringify({
        phase: 'explain',
        reply: 'Context-aware stub reply.',
        guidingQuestion: 'What is next?',
        uncertaintyNote: null,
        nextPhase: 'guiding_question',
      }),
    }),
  });
  const tutor = createTutorRuntime(gateway);

  beforeEach(async () => {
    await database.db.delete(tutorTurns);
    await database.db.delete(challenges);
    await database.db.delete(pathways);
    await database.db.delete(users).where(eq(users.role, 'admin'));
  });

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function cookieFor(
    app: Awaited<ReturnType<typeof buildApp>>,
    intent: 'learner' | 'teacher' | 'admin',
  ): Promise<string> {
    const email = `${intent}-e3s5-${randomUUID()}@example.com`;
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
      payload: {
        email,
        intent,
        ...(intent === 'learner' ? { ageConfirmed: true } : {}),
      },
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

  it('happy: tutor turn accepts pathway/challenge ids and lists them for the learner only', async () => {
    const app = await buildApp({ config, database, gateway, tutor, disableLogger: true });
    const admin = await cookieFor(app, 'admin');

    const pathwayRes = await app.inject({
      method: 'POST',
      url: '/admin/pathways',
      headers: { cookie: admin },
      payload: { title: 'Tutor pathway', locale: 'en' },
    });
    const pathwayId = (pathwayRes.json() as { pathway: { id: string } }).pathway.id;
    const challengeRes = await app.inject({
      method: 'POST',
      url: '/admin/challenges',
      headers: { cookie: admin },
      payload: { title: 'Tutor challenge', locale: 'en', pathwayId },
    });
    const challengeId = (challengeRes.json() as { challenge: { id: string } }).challenge.id;

    const learner = await cookieFor(app, 'learner');
    const turn = await app.inject({
      method: 'POST',
      url: '/tutor/turn',
      headers: { cookie: learner },
      payload: {
        locale: 'en',
        topic: 'rainfall',
        learnerMessage: 'Help with this pathway',
        phase: 'explain',
        pathwayId,
        challengeId,
      },
    });
    expect(turn.statusCode).toBe(200);

    const mine = await app.inject({
      method: 'GET',
      url: '/tutor/turns',
      headers: { cookie: learner },
    });
    expect(mine.statusCode).toBe(200);
    expect(mine.json()).toMatchObject({
      turns: [expect.objectContaining({ pathwayId, challengeId, topic: 'rainfall' })],
    });

    const teacher = await cookieFor(app, 'teacher');
    const teacherTurns = await app.inject({
      method: 'GET',
      url: '/tutor/turns',
      headers: { cookie: teacher },
    });
    expect(teacherTurns.statusCode).toBe(403);

    const teacherTurn = await app.inject({
      method: 'POST',
      url: '/tutor/turn',
      headers: { cookie: teacher },
      payload: {
        locale: 'en',
        topic: 'should-fail',
        learnerMessage: 'Teachers cannot use tutor',
        phase: 'explain',
      },
    });
    expect(teacherTurn.statusCode).toBe(403);

    await app.close();
  });
});
