import { createDatabase } from '@koode/database';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { createMemoryRateLimiter } from './lib/rate-limit.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('auth integration', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  it('rejects unauthenticated /auth/me', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const response = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(response.statusCode).toBe(401);
    expect(response.headers['x-request-id']).toBeTruthy();
    await app.close();
  });

  it('completes magic-link sign-in and logout', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
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
    expect(String(cookie).toLowerCase()).not.toContain('secure');
    const cookieHeader = String(cookie).split(';')[0]!;

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

  it('rejects reused magic-link tokens', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `reuse-${Date.now()}@example.com`;

    const requestLink = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email },
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

  it('hides magic-link tokens when dev mode is off', async () => {
    const app = await buildApp({
      config: { ...config, magicLinkDevMode: false },
      database,
      disableLogger: true,
    });
    const response = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email: `nodev-${Date.now()}@example.com` },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as Record<string, unknown>;
    expect(body.devToken).toBeUndefined();
    expect(body.devVerifyUrl).toBeUndefined();
    await app.close();
  });

  it('rate limits magic-link requests', async () => {
    const limiter = createMemoryRateLimiter({ windowMs: 60_000, max: 2 });
    const app = await buildApp({
      config,
      database,
      magicLinkLimiter: limiter,
      disableLogger: true,
    });

    const email = `rate-${Date.now()}@example.com`;
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/auth/magic-link/request',
          payload: { email },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/auth/magic-link/request',
          payload: { email },
        })
      ).statusCode,
    ).toBe(200);
    const limited = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email },
    });
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['retry-after']).toBeTruthy();

    await app.close();
  });
});
