/**
 * E9-S3: purge tutor turns older than retention window.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDatabase } from './client.js';
import { tutorTurns, users } from './schema/index.js';
import { purgeTutorTurnsOlderThan } from './purge-tutor-turns.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('purge tutor turns', () => {
  const database = createDatabase(databaseUrl!);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  it('deletes only turns older than cutoff and keeps recent ones', async () => {
    const [user] = await database.db.insert(users).values({ role: 'learner' }).returning();
    const now = new Date('2026-10-23T12:00:00.000Z');
    const oldDate = new Date('2025-01-01T00:00:00.000Z');
    const recentDate = new Date('2026-10-20T00:00:00.000Z');

    const [oldTurn] = await database.db
      .insert(tutorTurns)
      .values({
        userId: user!.id,
        locale: 'en',
        topic: 'old',
        phase: 'explain',
        nextPhase: 'guiding_question',
        learnerMessageHash: 'hash-old',
        reply: 'old reply',
        adapterId: 'stub',
        createdAt: oldDate,
      })
      .returning();
    const [recentTurn] = await database.db
      .insert(tutorTurns)
      .values({
        userId: user!.id,
        locale: 'en',
        topic: 'recent',
        phase: 'explain',
        nextPhase: 'guiding_question',
        learnerMessageHash: 'hash-recent',
        reply: 'recent reply',
        adapterId: 'stub',
        createdAt: recentDate,
      })
      .returning();

    const result = await purgeTutorTurnsOlderThan(database, 30, now);
    expect(result.deleted).toBeGreaterThanOrEqual(1);
    expect(result.retentionDays).toBe(30);

    const remainingOld = await database.db
      .select()
      .from(tutorTurns)
      .where(eq(tutorTurns.id, oldTurn!.id));
    const remainingRecent = await database.db
      .select()
      .from(tutorTurns)
      .where(eq(tutorTurns.id, recentTurn!.id));
    expect(remainingOld).toHaveLength(0);
    expect(remainingRecent).toHaveLength(1);

    await database.db.delete(users).where(eq(users.id, user!.id));
  });
});
