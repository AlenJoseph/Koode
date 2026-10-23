import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { challenges } from './challenges.js';
import { users } from './users.js';

/** Learner challenge attempt (E3-S2) — stub success criteria. */
export const challengeAttempts = pgTable('challenge_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  challengeId: uuid('challenge_id')
    .notNull()
    .references(() => challenges.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('in_progress'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
