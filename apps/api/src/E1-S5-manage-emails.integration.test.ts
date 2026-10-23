/**
 * E1-S5 independent suite: list / set primary / remove emails (GitHub-style).
 */
import { createDatabase } from '@koode/database';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E1-S5 manage emails', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function learnerCookie(app: Awaited<ReturnType<typeof buildApp>>, email: string) {
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

  it('happy: list, add second email via claim, set primary, remove non-last', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const stamp = Date.now();
    const primaryEmail = `mgmt-a-${stamp}@example.com`;
    const secondaryEmail = `mgmt-b-${stamp}@example.com`;
    const cookie = await learnerCookie(app, primaryEmail);

    const listed = await app.inject({
      method: 'GET',
      url: '/auth/emails',
      headers: { cookie },
    });
    expect(listed.statusCode).toBe(200);
    const firstList = (
      listed.json() as { emails: Array<{ id: string; email: string; isPrimary: boolean }> }
    ).emails;
    expect(firstList).toHaveLength(1);
    expect(firstList[0]?.email).toBe(primaryEmail);
    expect(firstList[0]?.isPrimary).toBe(true);
    const primaryId = firstList[0]!.id;

    const claimReq = await app.inject({
      method: 'POST',
      url: '/auth/emails/claim/request',
      headers: { cookie },
      payload: { email: secondaryEmail },
    });
    const { devToken } = claimReq.json() as { devToken: string };
    await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });

    const listed2 = await app.inject({
      method: 'GET',
      url: '/auth/emails',
      headers: { cookie },
    });
    const emails = (
      listed2.json() as { emails: Array<{ id: string; email: string; isPrimary: boolean }> }
    ).emails;
    expect(emails).toHaveLength(2);
    const secondary = emails.find((row) => row.email === secondaryEmail)!;
    expect(secondary.isPrimary).toBe(false);

    const makePrimary = await app.inject({
      method: 'POST',
      url: `/auth/emails/${secondary.id}/primary`,
      headers: { cookie },
    });
    expect(makePrimary.statusCode).toBe(200);

    const listed3 = await app.inject({
      method: 'GET',
      url: '/auth/emails',
      headers: { cookie },
    });
    const afterPrimary = (
      listed3.json() as { emails: Array<{ id: string; email: string; isPrimary: boolean }> }
    ).emails;
    expect(afterPrimary.filter((row) => row.isPrimary)).toHaveLength(1);
    expect(afterPrimary.find((row) => row.email === secondaryEmail)?.isPrimary).toBe(true);

    const removeOld = await app.inject({
      method: 'DELETE',
      url: `/auth/emails/${primaryId}`,
      headers: { cookie },
    });
    expect(removeOld.statusCode).toBe(200);

    const listed4 = await app.inject({
      method: 'GET',
      url: '/auth/emails',
      headers: { cookie },
    });
    expect((listed4.json() as { emails: unknown[] }).emails).toHaveLength(1);

    await app.close();
  });

  it('negative: cannot remove last email; unknown id 404', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const stamp = Date.now();
    const cookie = await learnerCookie(app, `mgmt-last-${stamp}@example.com`);

    const listed = await app.inject({
      method: 'GET',
      url: '/auth/emails',
      headers: { cookie },
    });
    const only = (
      listed.json() as { emails: Array<{ id: string }> }
    ).emails[0]!;

    const removeLast = await app.inject({
      method: 'DELETE',
      url: `/auth/emails/${only.id}`,
      headers: { cookie },
    });
    expect(removeLast.statusCode).toBe(400);

    const missing = await app.inject({
      method: 'DELETE',
      url: '/auth/emails/00000000-0000-4000-8000-000000000099',
      headers: { cookie },
    });
    expect(missing.statusCode).toBe(404);

    await app.close();
  });
});
