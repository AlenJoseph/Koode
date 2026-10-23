import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { challenges } from './challenges.js';
import { pathways } from './pathways.js';
import { users } from './users.js';

/** Idempotent coin grants/spends. Positive = earn, negative = spend. */
export const coinLedger = pgTable(
  'coin_ledger',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    reason: text('reason').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    challengeId: uuid('challenge_id').references(() => challenges.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('coin_ledger_idempotency_uidx').on(table.idempotencyKey)],
);

export const shopRedemptions = pgTable(
  'shop_redemptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemId: text('item_id').notNull(),
    costCoins: integer('cost_coins').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('shop_redemptions_user_item_uidx').on(table.userId, table.itemId)],
);

/** Evidence artifact — never sold for coins. */
export const certificates = pgTable('certificates', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  pathwayId: uuid('pathway_id').references(() => pathways.id, { onDelete: 'set null' }),
  challengeId: uuid('challenge_id').references(() => challenges.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  evidenceSummary: text('evidence_summary').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
});

/** Lesson step checkpoints for resume. */
export const lessonProgress = pgTable(
  'lesson_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    challengeId: uuid('challenge_id')
      .notNull()
      .references(() => challenges.id, { onDelete: 'cascade' }),
    currentStepId: text('current_step_id').notNull(),
    completedStepIds: text('completed_step_ids').notNull().default('[]'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('lesson_progress_user_challenge_uidx').on(table.userId, table.challengeId)],
);
