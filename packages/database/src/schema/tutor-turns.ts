import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { challenges } from './challenges.js';
import { pathways } from './pathways.js';
import { users } from './users.js';

/**
 * Evidence trail for tutor interactions.
 * Stores validated model output; learner message is hashed only (privacy).
 */
export const tutorTurns = pgTable('tutor_turns', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull(),
  topic: text('topic').notNull(),
  phase: text('phase').notNull(),
  nextPhase: text('next_phase').notNull(),
  learnerMessageHash: text('learner_message_hash').notNull(),
  reply: text('reply').notNull(),
  guidingQuestion: text('guiding_question'),
  uncertaintyNote: text('uncertainty_note'),
  adapterId: text('adapter_id').notNull(),
  requestId: text('request_id'),
  pathwayId: uuid('pathway_id').references(() => pathways.id, { onDelete: 'set null' }),
  challengeId: uuid('challenge_id').references(() => challenges.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

