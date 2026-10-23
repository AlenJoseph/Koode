import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { challenges } from './challenges.js';
import { pathways } from './pathways.js';
import { users } from './users.js';

/** Learner project stub (E3-S3) — optional pathway/challenge link. */
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  pathwayId: uuid('pathway_id').references(() => pathways.id, { onDelete: 'set null' }),
  challengeId: uuid('challenge_id').references(() => challenges.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
