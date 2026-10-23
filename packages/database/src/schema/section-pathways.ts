import { pgTable, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';
import { pathways } from './pathways.js';
import { sections } from './sections.js';

/** Optional curriculum direction for a section (guidance, not a lock). */
export const sectionPathways = pgTable(
  'section_pathways',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => sections.id, { onDelete: 'cascade' }),
    pathwayId: uuid('pathway_id')
      .notNull()
      .references(() => pathways.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('section_pathways_section_pathway_uidx').on(table.sectionId, table.pathwayId),
  ],
);
