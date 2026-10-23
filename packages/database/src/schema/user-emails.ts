import { sql } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * GitHub-style emails: many verified addresses per user; one primary.
 * Email is globally unique across accounts.
 */
export const userEmails = pgTable(
  'user_emails',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_emails_email_uidx').on(table.email),
    uniqueIndex('user_emails_one_primary_uidx')
      .on(table.userId)
      .where(sql`${table.isPrimary} = true`),
  ],
);
