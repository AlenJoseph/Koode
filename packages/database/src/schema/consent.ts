import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const consentRecords = pgTable('consent_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  consentType: text('consent_type').notNull(),
  granted: boolean('granted').notNull().default(false),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
});
