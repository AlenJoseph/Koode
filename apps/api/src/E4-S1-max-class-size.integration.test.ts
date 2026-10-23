/**
 * E4-S1 independent suite: section roster hard-stops at 50 students.
 */
import {
  consentRecords,
  createDatabase,
  learnerProfiles,
  sectionStudents,
  users,
} from '@koode/database';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { hashToken } from './crypto.js';
import { MAX_SECTION_STUDENTS } from './classroom/service.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E4-S1 max class size', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  it('negative: 51st add-student is refused with a clear full-section message', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const email = `teacher-cap-${randomUUID()}@example.com`;

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
      payload: { name: 'Full class' },
    });
    expect(createSection.statusCode).toBe(200);
    const sectionId = (createSection.json() as { section: { id: string } }).section.id;

    // Seed 50 roster rows directly so the boundary test stays fast.
    for (let i = 0; i < MAX_SECTION_STUDENTS; i += 1) {
      const [studentUser] = await database.db
        .insert(users)
        .values({ role: 'student' })
        .returning();
      await database.db.insert(learnerProfiles).values({
        userId: studentUser!.id,
        displayName: `Seed ${i}`,
        preferredLocale: 'en',
      });
      await database.db.insert(consentRecords).values({
        userId: studentUser!.id,
        consentType: 'classroom_participation_stub',
        granted: true,
      });
      await database.db.insert(sectionStudents).values({
        sectionId,
        userId: studentUser!.id,
        displayName: `Seed ${i}`,
        secretWordsHash: hashToken(`SEED WORDS ${i}`),
      });
    }

    const overflow = await app.inject({
      method: 'POST',
      url: `/classroom/sections/${sectionId}/students`,
      headers: { cookie },
      payload: { displayName: 'One too many' },
    });
    expect(overflow.statusCode).toBe(409);
    expect(overflow.json()).toMatchObject({
      error: `Section is full (max ${MAX_SECTION_STUDENTS} students)`,
    });

    await app.close();
  });
});
