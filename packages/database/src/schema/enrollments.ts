import { pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';
import { pathways } from './pathways.js';
import { users } from './users.js';

/** Learner enrollment in a pathway (E3-S1). */
export const pathwayEnrollments = pgTable(
  'pathway_enrollments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    pathwayId: uuid('pathway_id')
      .notNull()
      .references(() => pathways.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('active'),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('pathway_enrollments_user_pathway_uidx').on(table.userId, table.pathwayId),
  ],
);
