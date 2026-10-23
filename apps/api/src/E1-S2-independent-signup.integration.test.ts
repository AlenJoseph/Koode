/**
 * E1-S2 independent suite: learner magic-link sign-up.
 * Happy + negative paths; does not depend on other epic e2e suites.
 */
import { createDatabase, magicLinkTokens } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { createOpaqueToken, hashToken } from './crypto.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E1-S2 independent learner signup', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function signUpLearner(app: Awaited<ReturnType<typeof buildApp>>, email: string) {
    const requestLink = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email, intent: 'learner', ageConfirmed: true },
    });
    expect(requestLink.statusCode).toBe(200);
    const { devToken } = requestLink.json() as { devToken: string };
    const verify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });
    if (verify.statusCode !== 200) {
      // Surface body for CI debugging when verify unexpectedly forbids.
      expect({ status: verify.statusCode, body: verify.json() }).toEqual({
        status: 200,
        body: expect.anything(),
      });
    }
    return verify;
  }

  it('happy: creates learner role, session, and allows tutor', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `learner-${randomUUID()}@example.com`;

    const verify = await signUpLearner(app, email);
    expect(verify.statusCode).toBe(200);
    expect(verify.json()).toMatchObject({
      ok: true,
      user: { email, role: 'learner' },
    });

    const setCookie = verify.headers['set-cookie'];
    const cookie = String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;

    const me = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ user: { role: 'learner', email } });

    const tutor = await app.inject({
      method: 'POST',
      url: '/tutor/turn',
      headers: { cookie },
      payload: {
        locale: 'en',
        topic: 'rainfall',
        learnerMessage: 'Help me understand rainfall',
        phase: 'explain',
      },
    });
    expect(tutor.statusCode).toBe(200);

    await app.close();
  });

  it('negative: learner cannot use teacher classroom APIs', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `learner-forbid-${randomUUID()}@example.com`;

    const verify = await signUpLearner(app, email);
    const setCookie = verify.headers['set-cookie'];
    const cookie = String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;

    const createSection = await app.inject({
      method: 'POST',
      url: '/classroom/sections',
      headers: { cookie },
      payload: { name: 'Should fail' },
    });
    expect(createSection.statusCode).toBe(403);

    await app.close();
  });

  it('negative: learner request without ageConfirmed is rejected', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const denied = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email: `no-age-${randomUUID()}@example.com`, intent: 'learner' },
    });
    expect(denied.statusCode).toBe(400);
    await app.close();
  });

  it('negative: invalid and reused tokens fail', async () => {
    const app = await buildApp({ config, database, disableLogger: true });

    const bad = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: 'this-token-is-long-enough-but-invalid' },
    });
    expect(bad.statusCode).toBe(401);

    const email = `reuse-${randomUUID()}@example.com`;

    const requestLink = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email, intent: 'learner', ageConfirmed: true },
    });
    const { devToken } = requestLink.json() as { devToken: string };

    const first = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });
    expect(second.statusCode).toBe(401);

    await app.close();
  });

  it('negative: expired magic-link token fails', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const token = createOpaqueToken();
    await database.db.insert(magicLinkTokens).values({
      email: `expired-${randomUUID()}@example.com`,

      intent: 'learner',
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() - 60_000),
    });

    const expired = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token },
    });
    expect(expired.statusCode).toBe(401);

    await app.close();
  });

  it('happy: signing in again as learner reuses the same account', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `return-${randomUUID()}@example.com`;


    const first = await signUpLearner(app, email);
    const firstUser = (first.json() as { user: { id: string } }).user;

    const second = await signUpLearner(app, email);
    const secondUser = (second.json() as { user: { id: string; role: string } }).user;
    expect(secondUser.id).toBe(firstUser.id);
    expect(secondUser.role).toBe('learner');

    await app.close();
  });
});
