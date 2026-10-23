/**
 * E4-S5 independent suite: roster export CSV/JSON without secret hashes.
 */
import { createDatabase } from '@koode/database';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E4-S5 roster export', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  it('happy: exports JSON and CSV with names/codes and no secret hashes', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `teacher-ex-${randomUUID()}@example.com`;
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
    const cookie = String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;

    const createSection = await app.inject({
      method: 'POST',
      url: '/classroom/sections',
      headers: { cookie },
      payload: { name: 'Export class' },
    });
    const section = (createSection.json() as { section: { id: string; code: string } }).section;

    await app.inject({
      method: 'POST',
      url: `/classroom/sections/${section.id}/students`,
      headers: { cookie },
      payload: { displayName: 'Asha' },
    });

    const json = await app.inject({
      method: 'GET',
      url: `/classroom/sections/${section.id}/export`,
      headers: { cookie },
    });
    expect(json.statusCode).toBe(200);
    const body = json.json() as {
      section: { code: string; name: string };
      roster: Array<Record<string, unknown>>;
    };
    expect(body.section).toMatchObject({ code: section.code, name: 'Export class' });
    expect(body.roster[0]).toMatchObject({ displayName: 'Asha' });
    expect(JSON.stringify(body)).not.toMatch(/secret/i);
    expect(body.roster[0]).not.toHaveProperty('secretWordsHash');
    expect(body.roster[0]).not.toHaveProperty('secretWords');

    const csv = await app.inject({
      method: 'GET',
      url: `/classroom/sections/${section.id}/export?format=csv`,
      headers: { cookie },
    });
    expect(csv.statusCode).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.body).toContain('section_code,section_name,display_name');
    expect(csv.body).toContain('Asha');
    expect(csv.body).toContain(section.code);
    expect(csv.body.toLowerCase()).not.toContain('secret');

    await app.close();
  });
});
