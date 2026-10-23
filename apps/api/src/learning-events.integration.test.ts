/**
 * Phase A: learning event ingest, idempotency, auto-help fail streak.
 */
import { createDatabase, seedContentManuals, challenges } from '@koode/database';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;
const contentRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../content');

describe.runIf(Boolean(databaseUrl))('learning events Phase A', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);
  let challengeSlug = 'pause-before-react';

  beforeAll(async () => {
    await seedContentManuals(database, contentRoot);
    const [row] = await database.db
      .select()
      .from(challenges)
      .where(eq(challenges.slug, challengeSlug))
      .limit(1);
    expect(row).toBeTruthy();
  });

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function learnerCookie(app: Awaited<ReturnType<typeof buildApp>>): Promise<string> {
    const email = `events-learner-${randomUUID()}@example.com`;
    const requested = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email, intent: 'learner', ageConfirmed: true },
    });
    const { devToken } = requested.json() as { devToken: string };
    const verify = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: devToken },
    });
    const setCookie = verify.headers['set-cookie'];
    return String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0]!;
  }

  it('accepts events, dedupes eventId, nudges on fail streak', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const cookie = await learnerCookie(app);
    const eventId = randomUUID();
    const fail1 = randomUUID();
    const fail2 = randomUUID();

    const first = await app.inject({
      method: 'POST',
      url: '/learning/events',
      headers: { cookie },
      payload: {
        events: [
          {
            eventId,
            eventType: 'STEP_ENTERED',
            pathwayId: 'know-yourself',
            contentId: challengeSlug,
            stepId: 'quiz-1',
            occurredAt: new Date().toISOString(),
            payload: {},
          },
        ],
      },
    });
    expect(first.statusCode).toBe(200);
    expect((first.json() as { accepted: number }).accepted).toBe(1);

    const dup = await app.inject({
      method: 'POST',
      url: '/learning/events',
      headers: { cookie },
      payload: {
        events: [
          {
            eventId,
            eventType: 'STEP_ENTERED',
            pathwayId: 'know-yourself',
            contentId: challengeSlug,
            stepId: 'quiz-1',
            occurredAt: new Date().toISOString(),
            payload: {},
          },
        ],
      },
    });
    expect(dup.statusCode).toBe(200);
    expect((dup.json() as { duplicates: number }).duplicates).toBe(1);

    const fails = await app.inject({
      method: 'POST',
      url: '/learning/events',
      headers: { cookie },
      payload: {
        events: [
          {
            eventId: fail1,
            eventType: 'QUIZ_ANSWERED',
            pathwayId: 'know-yourself',
            contentId: challengeSlug,
            stepId: 'quiz-1',
            occurredAt: new Date().toISOString(),
            payload: { correct: false, question_id: 'q1', graded: true },
          },
          {
            eventId: fail2,
            eventType: 'QUIZ_ANSWERED',
            pathwayId: 'know-yourself',
            contentId: challengeSlug,
            stepId: 'quiz-1',
            occurredAt: new Date().toISOString(),
            payload: { correct: false, question_id: 'q1', graded: true },
          },
        ],
      },
    });
    expect(fails.statusCode).toBe(200);
    const body = fails.json() as { nudge: { reason: string } | null };
    expect(body.nudge?.reason).toBe('fail_streak');

    const listed = await app.inject({
      method: 'GET',
      url: `/learning/events?contentId=${challengeSlug}`,
      headers: { cookie },
    });
    expect(listed.statusCode).toBe(200);
    expect((listed.json() as { events: unknown[] }).events.length).toBeGreaterThanOrEqual(2);
  });

  it('awards coins and certificate on perfect quiz', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const cookie = await learnerCookie(app);
    const [row] = await database.db
      .select()
      .from(challenges)
      .where(eq(challenges.slug, challengeSlug))
      .limit(1);
    const challengeId = row!.id;

    const started = await app.inject({
      method: 'POST',
      url: `/challenges/${challengeId}/attempts`,
      headers: { cookie },
    });
    const { attempt } = started.json() as { attempt: { id: string } };

    const submitted = await app.inject({
      method: 'POST',
      url: `/challenges/attempts/${attempt.id}/quiz`,
      headers: { cookie },
      payload: { answers: [{ quizItemId: 'q1', optionId: 'b' }] },
    });
    expect(submitted.statusCode).toBe(200);
    const result = submitted.json() as {
      score: { correct: number; total: number };
      coins: { awarded: boolean; balance: number } | null;
      certificate: { title: string } | null;
    };
    expect(result.score.correct).toBe(1);
    expect(result.coins?.awarded).toBe(true);
    expect(result.coins!.balance).toBeGreaterThanOrEqual(15);
    expect(result.certificate?.title).toContain('Pause');

    const bal = await app.inject({
      method: 'GET',
      url: '/economy/balance',
      headers: { cookie },
    });
    expect(bal.statusCode).toBe(200);
    expect((bal.json() as { balance: number }).balance).toBeGreaterThanOrEqual(15);

    const lesson = await app.inject({
      method: 'GET',
      url: `/challenges/${challengeId}/lesson`,
      headers: { cookie },
    });
    expect(lesson.statusCode).toBe(200);
    expect((lesson.json() as { lesson: { steps: unknown[] } }).lesson.steps.length).toBeGreaterThan(1);
  });
});
