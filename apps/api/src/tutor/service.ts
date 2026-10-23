import type { TutorRuntime } from '@koode/agent-runtime';
import {
  tutorTurnRequestSchema,
  type TutorTurnResponse,
} from '@koode/contracts';
import { tutorTurns, type Database } from '@koode/database';
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
      });

      return turn;
    },
  };
}

export type TutorService = ReturnType<typeof createTutorService>;
