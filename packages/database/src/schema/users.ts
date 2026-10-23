import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Account identity. Emails live in `user_emails` (multi-email / GitHub-style).
 * teacher = magic-link; student = section + secret words (may claim emails later).
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  role: text('role').notNull().default('teacher'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
