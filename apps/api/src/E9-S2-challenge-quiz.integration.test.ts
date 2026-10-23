/**
 * E9-S2: learner quiz from content manuals (happy + negative).
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

describe.runIf(Boolean(databaseUrl))('E9-S2 challenge quiz', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);
  let challengeId = '';

  beforeAll(async () => {
    await seedContentManuals(database, contentRoot);
    const [row] = await database.db
      .select()
      .from(challenges)
      .where(eq(challenges.slug, 'pause-before-react'))
      .limit(1);
    challengeId = row!.id;
  });

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  async function learnerCookie(app: Awaited<ReturnType<typeof buildApp>>): Promise<string> {
    const email = `quiz-learner-${randomUUID()}@example.com`;
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

  it('happy: fetch quiz without answers, submit grades and completes', async () => {
    const app = await buildApp({ config, database, disableLogger: true });
    const cookie = await learnerCookie(app);

    const quizRes = await app.inject({
      method: 'GET',
      url: `/challenges/${challengeId}/quiz`,
      headers: { cookie },
    });
    expect(quizRes.statusCode).toBe(200);
    const { quiz } = quizRes.json() as {
      quiz: {
        slug: string;
        quiz: Array<{ id: string; options: Array<{ id: string }> }>;
      };
    };
    expect(quiz.slug).toBe('pause-before-react');
    expect(JSON.stringify(quiz)).not.toMatch(/correctOptionId/);
    expect(quiz.quiz.length).toBeGreaterThan(0);

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
      payload: {
        answers: quiz.quiz.map((item) => ({
          quizItemId: item.id,
          // Correct answer for pause-before-react q1 is "b".
          optionId: item.id === 'q1' ? 'b' : item.options[0]!.id,
        })),
      },
    });
    expect(submitted.statusCode).toBe(200);
    const result = submitted.json() as {
      attempt: { status: string };
      score: { correct: number; total: number };
      items: Array<{ teachBack: string; isCorrect: boolean }>;
    };
    expect(result.attempt.status).toBe('completed');
    expect(result.score.total).toBe(quiz.quiz.length);
    expect(result.score.correct).toBe(result.score.total);
    expect(result.items[0]?.teachBack.length).toBeGreaterThan(0);

    await app.close();
  });

  it('negative: unauthenticated quiz 401; missing answers 400', async () => {
    const app = await buildApp({ config, database, disableLogger: true });

    const noAuth = await app.inject({
      method: 'GET',
      url: `/challenges/${challengeId}/quiz`,
    });
    expect(noAuth.statusCode).toBe(401);

    const cookie = await learnerCookie(app);
    const started = await app.inject({
      method: 'POST',
      url: `/challenges/${challengeId}/attempts`,
      headers: { cookie },
    });
    const { attempt } = started.json() as { attempt: { id: string } };

    const bad = await app.inject({
      method: 'POST',
      url: `/challenges/attempts/${attempt.id}/quiz`,
      headers: { cookie },
      payload: { answers: [] },
    });
    expect(bad.statusCode).toBe(400);

    await app.close();
  });
});
