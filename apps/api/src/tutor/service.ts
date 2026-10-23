import type { TutorRuntime } from '@koode/agent-runtime';
import {
  tutorTurnRequestSchema,
  type TutorTurnResponse,
} from '@koode/contracts';
import { tutorTurns, type Database } from '@koode/database';
import { desc, eq } from 'drizzle-orm';
import { hashToken } from '../crypto.js';

export type TutorTurnMeta = {
  userId: string;
  adapterId: string;
  requestId: string;
};

export function createTutorService(database: Database, runtime: TutorRuntime) {
  const { db } = database;

  return {
    async runAndPersist(input: unknown, meta: TutorTurnMeta): Promise<TutorTurnResponse> {
      const request = tutorTurnRequestSchema.parse(input);
      const turn = await runtime.runTurn(request);

      await db.insert(tutorTurns).values({
        userId: meta.userId,
        locale: request.locale,
        topic: request.topic,
        phase: turn.phase,
        nextPhase: turn.nextPhase,
        learnerMessageHash: hashToken(request.learnerMessage),
        reply: turn.reply,
        guidingQuestion: turn.guidingQuestion,
        uncertaintyNote: turn.uncertaintyNote,
        adapterId: meta.adapterId,
        requestId: meta.requestId,
        pathwayId: request.pathwayId ?? null,
        challengeId: request.challengeId ?? null,
      });

      return turn;
    },

    /** Own turns only — never expose another user's tutor chat (incl. to teachers). */
    async listForUser(userId: string) {
      const rows = await db
        .select({
          id: tutorTurns.id,
          topic: tutorTurns.topic,
          phase: tutorTurns.phase,
          reply: tutorTurns.reply,
          pathwayId: tutorTurns.pathwayId,
          challengeId: tutorTurns.challengeId,
          createdAt: tutorTurns.createdAt,
        })
        .from(tutorTurns)
        .where(eq(tutorTurns.userId, userId))
        .orderBy(desc(tutorTurns.createdAt))
        .limit(50);
      return rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      }));
    },
  };
}

export type TutorService = ReturnType<typeof createTutorService>;
