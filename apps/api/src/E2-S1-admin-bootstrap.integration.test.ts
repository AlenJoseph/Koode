/**
 * E2-S1 independent suite: first-run platform admin bootstrap.
 */
import { createDatabase, users } from '@koode/database';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E2-S1 admin bootstrap', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  beforeEach(async () => {
    await database.db.delete(users).where(eq(users.role, 'admin'));
  });

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  it('happy: creates first admin and signs in via admin magic link', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `admin-${Date.now()}@example.com`;

    const statusBefore = await app.inject({ method: 'GET', url: '/admin/bootstrap/status' });
    expect(statusBefore.json()).toMatchObject({ bootstrapped: false, bootstrapEnabled: true });

    const bootstrap = await app.inject({
      method: 'POST',
      url: '/admin/bootstrap',
      payload: { email, bootstrapSecret: config.bootstrapSecret },
    });
    expect(bootstrap.statusCode).toBe(200);
    const body = bootstrap.json() as { email: string; userId: string; devToken: string };
    expect(body.email).toBe(email);
    expect(body.devToken).toBeTruthy();

    const verify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: body.devToken },
    });
    expect(verify.statusCode).toBe(200);
    expect(verify.json()).toMatchObject({ user: { email, role: 'admin' } });

    await app.close();
  });

  it('negative: second bootstrap refused; wrong secret refused; secret not echoed', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `admin2-${Date.now()}@example.com`;

    const first = await app.inject({
      method: 'POST',
      url: '/admin/bootstrap',
      payload: { email, bootstrapSecret: config.bootstrapSecret },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: 'POST',
      url: '/admin/bootstrap',
      payload: {
        email: `admin3-${Date.now()}@example.com`,
        bootstrapSecret: config.bootstrapSecret,
      },
    });
    expect(second.statusCode).toBe(409);

    await database.db.delete(users).where(eq(users.role, 'admin'));
    const wrong = await app.inject({
      method: 'POST',
      url: '/admin/bootstrap',
      payload: { email: `admin4-${Date.now()}@example.com`, bootstrapSecret: 'wrong-secret-xxxxxx' },
    });
    expect(wrong.statusCode).toBe(403);
    expect(JSON.stringify(wrong.json())).not.toContain(config.bootstrapSecret);

    await app.close();
  });
});
