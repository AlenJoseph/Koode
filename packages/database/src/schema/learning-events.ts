import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

/** Append-only learning activity facts (itza-style envelope). */
export const learningEvents = pgTable(
  'learning_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id').notNull(),
    eventType: text('event_type').notNull(),
    learnerId: uuid('learner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    pathwayId: text('pathway_id'),
    contentId: text('content_id'),
    stepId: text('step_id'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('learning_events_event_id_uidx').on(table.eventId),
    index('learning_events_learner_occurred_idx').on(table.learnerId, table.occurredAt),
    index('learning_events_learner_type_idx').on(table.learnerId, table.eventType),
  ],
);

/** Per learner+scope nudge state so we do not spam. scopeKey = contentId:stepId */
export const autoHelpState = pgTable(
  'auto_help_state',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    learnerId: uuid('learner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    scopeKey: text('scope_key').notNull(),
    pathwayId: text('pathway_id'),
    contentId: text('content_id'),
    stepId: text('step_id'),
    lastNudgeReason: text('last_nudge_reason'),
    lastNudgeAt: timestamp('last_nudge_at', { withTimezone: true }),
    suppressedUntil: timestamp('suppressed_until', { withTimezone: true }),
    failCount: integer('fail_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('auto_help_state_learner_scope_uidx').on(table.learnerId, table.scopeKey)],
);
