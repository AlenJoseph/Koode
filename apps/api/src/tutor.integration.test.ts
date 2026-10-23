import { createTutorRuntime } from '@koode/agent-runtime';
import { createAiGateway, createStubAdapter } from '@koode/ai-gateway';
import { createDatabase, tutorTurns } from '@koode/database';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('tutor integration', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);
  const gateway = createAiGateway({
    adapter: createStubAdapter({
      content: JSON.stringify({
        phase: 'explain',
        reply: 'Start by noticing rainfall patterns near you.',
        guidingQuestion: 'What would you measure first?',
        uncertaintyNote: null,
        nextPhase: 'guiding_question',
      }),
    }),
  });
  const tutor = createTutorRuntime(gateway);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function signIn(app: Awaited<ReturnType<typeof buildApp>>, email: string) {
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

  it('rejects unauthenticated tutor turns', async () => {
    const app = await buildApp({ config, database, gateway, tutor, disableLogger: true });
    const response = await app.inject({
      method: 'POST',
      url: '/tutor/turn',
      payload: {
        locale: 'en',
        topic: 'rainfall',
        learnerMessage: 'help',
      },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('returns and persists a schema-valid tutor turn for en and ml', async () => {
    const app = await buildApp({ config, database, gateway, tutor, disableLogger: true });
    const cookie = await signIn(app, `tutor-${Date.now()}@example.com`);

    let userId = '';
    for (const locale of ['en', 'ml'] as const) {
      const response = await app.inject({
        method: 'POST',
        url: '/tutor/turn',
        headers: { cookie, 'x-request-id': `req-${locale}-test` },
        payload: {
          locale,
          topic: 'local rainfall',
          learnerMessage: 'I want to learn',
          phase: 'explain',
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['x-request-id']).toBe(`req-${locale}-test`);
      const body = response.json() as {
        ok: true;
        adapter: string;
        userId: string;
        turn: { phase: string; nextPhase: string };
      };
      expect(body).toMatchObject({
        ok: true,
        adapter: 'stub',
        turn: {
          phase: 'explain',
          nextPhase: 'guiding_question',
        },
      });
      userId = body.userId;
    }

    const rows = await database.db.query.tutorTurns.findMany({
      where: eq(tutorTurns.userId, userId),
    });
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.every((row) => row.learnerMessageHash.length === 64)).toBe(true);
    expect(rows.every((row) => !row.reply.includes('I want to learn'))).toBe(true);

    await app.close();
  });
});
