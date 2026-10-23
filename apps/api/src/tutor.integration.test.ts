import { createTutorRuntime } from '@koode/agent-runtime';
import { createAiGateway, createStubAdapter } from '@koode/ai-gateway';
import { createDatabase } from '@koode/database';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import type { ApiConfig } from './config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('tutor integration', () => {
  const config: ApiConfig = {
    port: 0,
    databaseUrl: databaseUrl!,
    sessionSecret: 'ci-session-secret-at-least-32-chars-long',
    appOrigin: 'http://localhost:3000',
    magicLinkDevMode: true,
    cookieSecure: false,
    sessionTtlMs: 1000 * 60 * 60,
    magicLinkTtlMs: 1000 * 60 * 15,
    cookieName: 'koode_session',
  };

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
    const app = await buildApp({ config, database, gateway, tutor });
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

  it('returns a schema-valid tutor turn for en and ml', async () => {
    const app = await buildApp({ config, database, gateway, tutor });
    const cookie = await signIn(app, `tutor-${Date.now()}@example.com`);

    for (const locale of ['en', 'ml'] as const) {
      const response = await app.inject({
        method: 'POST',
        url: '/tutor/turn',
        headers: { cookie },
        payload: {
          locale,
          topic: 'local rainfall',
          learnerMessage: 'I want to learn',
          phase: 'explain',
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        ok: true,
        adapter: 'stub',
        turn: {
          phase: 'explain',
          nextPhase: 'guiding_question',
        },
      });
    }

    await app.close();
  });
});
