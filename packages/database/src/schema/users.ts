import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** teacher = email magic-link; student = section + secret words (email usually null). */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique(),
  role: text('role').notNull().default('teacher'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
