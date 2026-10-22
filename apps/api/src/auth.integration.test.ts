import { createDatabase } from '@koode/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import type { ApiConfig } from './config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('auth integration', () => {
  const config: ApiConfig = {
    port: 0,
    databaseUrl: databaseUrl!,
    sessionSecret: 'ci-session-secret-at-least-32-chars-long',
    appOrigin: 'http://localhost:3000',
    magicLinkDevMode: true,
    sessionTtlMs: 1000 * 60 * 60,
    magicLinkTtlMs: 1000 * 60 * 15,
    cookieName: 'koode_session',
  };

  const database = createDatabase(config.databaseUrl);
  let cookieHeader = '';

  beforeAll(async () => {
    // Schema is applied by `pnpm db:migrate` before CI tests.
  });

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  it('rejects unauthenticated /auth/me', async () => {
    const app = await buildApp({ config, database });
    const response = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('completes magic-link sign-in and logout', async () => {
    const app = await buildApp({ config, database });
    const email = `learner-${Date.now()}@example.com`;

    const requestLink = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email },
    });
    expect(requestLink.statusCode).toBe(200);
    const body = requestLink.json() as { devToken?: string };
    expect(body.devToken).toBeTruthy();

    const verify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: body.devToken },
    });
    expect(verify.statusCode).toBe(200);
    expect(verify.json()).toMatchObject({
      ok: true,
      user: { email },
    });
    const setCookie = verify.headers['set-cookie'];
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookie).toBeTruthy();
    cookieHeader = String(cookie).split(';')[0]!;

    const me = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: cookieHeader },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ user: { email } });

    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie: cookieHeader },
    });
    expect(logout.statusCode).toBe(200);

    const meAfter = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: cookieHeader },
    });
    expect(meAfter.statusCode).toBe(401);

    await app.close();
  });
});
