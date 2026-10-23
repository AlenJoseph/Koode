import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/** Learning pathway shell — content only (E2-S3). */
export const pathways = pgTable('pathways', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** Stable content manual id (kebab-case), e.g. know-yourself. Null for admin-only drafts. */
  slug: text('slug'),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  locale: text('locale').notNull().default('en'),
  status: text('status').notNull().default('draft'),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
