import { challengeAttempts, challenges, type Database } from '@koode/database';
import { and, desc, eq } from 'drizzle-orm';
import { AuthError } from '../auth/errors.js';

function toChallengePublic(row: {
  id: string;
  title: string;
  summary: string;
  locale: string;
  status: string;
  pathwayId: string | null;
}) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    locale: row.locale,
    status: row.status,
    pathwayId: row.pathwayId,
  };
}

function toAttemptPublic(row: {
  id: string;
  challengeId: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
}) {
  return {
    id: row.id,
    challengeId: row.challengeId,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

export function createLearnerChallengeService(database: Database) {
  const { db } = database;

  return {
    async listPublished() {
      const rows = await db
        .select()
        .from(challenges)
        .where(eq(challenges.status, 'published'))
        .orderBy(desc(challenges.updatedAt));
      return rows.map(toChallengePublic);
    },

    async listAttempts(userId: string) {
      const rows = await db
        .select()
        .from(challengeAttempts)
        .where(eq(challengeAttempts.userId, userId))
        .orderBy(desc(challengeAttempts.startedAt));
      return rows.map(toAttemptPublic);
    },

    async startAttempt(userId: string, challengeId: string) {
      const challenge = await db.query.challenges.findFirst({
        where: eq(challenges.id, challengeId),
      });
      if (!challenge || challenge.status !== 'published') {
        throw new AuthError('Challenge not found', 404);
      }

      const open = await db.query.challengeAttempts.findFirst({
        where: and(
          eq(challengeAttempts.userId, userId),
          eq(challengeAttempts.challengeId, challengeId),
          eq(challengeAttempts.status, 'in_progress'),
        ),
      });
      if (open) {
        return toAttemptPublic(open);
      }

      const [row] = await db
        .insert(challengeAttempts)
        .values({
          userId,
          challengeId,
          status: 'in_progress',
        })
        .returning();
      if (!row) {
        throw new AuthError('Failed to start attempt', 500);
      }
      return toAttemptPublic(row);
    },

    async completeAttempt(userId: string, attemptId: string) {
      const existing = await db.query.challengeAttempts.findFirst({
        where: and(eq(challengeAttempts.id, attemptId), eq(challengeAttempts.userId, userId)),
      });
      if (!existing) {
        throw new AuthError('Attempt not found', 404);
      }
      if (existing.status === 'completed') {
        return toAttemptPublic(existing);
      }

      // Stub success criteria: completing the attempt always succeeds.
      const now = new Date();
      const [row] = await db
        .update(challengeAttempts)
        .set({ status: 'completed', completedAt: now, updatedAt: now })
        .where(eq(challengeAttempts.id, attemptId))
        .returning();
      if (!row) {
        throw new AuthError('Attempt not found', 404);
      }
      return toAttemptPublic(row);
    },
  };
}

export type LearnerChallengeService = ReturnType<typeof createLearnerChallengeService>;
