import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { pathways } from './pathways.js';
import { users } from './users.js';

/** Challenge shell — content only (E2-S4); optional pathway link. */
export const challenges = pgTable('challenges', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  locale: text('locale').notNull().default('en'),
  status: text('status').notNull().default('draft'),
  pathwayId: uuid('pathway_id').references(() => pathways.id, { onDelete: 'set null' }),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
