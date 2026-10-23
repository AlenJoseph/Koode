/**
 * Content manuals → DB shells seed (idempotent upsert by slug).
 */
import { afterAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { createDatabase } from './client.js';
import { challenges, pathways } from './schema/index.js';
import { seedContentManuals } from './seed-content.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('seed content manuals', () => {
  const database = createDatabase(databaseUrl!);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  it('upserts six published pathways and their challenges by slug', async () => {
    const first = await seedContentManuals(database);
    expect(first.pathwaysUpserted).toBe(6);
    expect(first.challengesUpserted).toBeGreaterThanOrEqual(12);
    expect(first.pathwaySlugs).toContain('know-yourself');
    expect(first.challengeSlugs).toContain('pause-before-react');

    const second = await seedContentManuals(database);
    expect(second.pathwaysUpserted).toBe(6);
    expect(second.challengeSlugs).toEqual(first.challengeSlugs);

    const pathwayRows = await database.db
      .select()
      .from(pathways)
      .where(inArray(pathways.slug, first.pathwaySlugs));
    expect(pathwayRows).toHaveLength(6);
    expect(pathwayRows.every((row) => row.status === 'published')).toBe(true);

    const challengeRows = await database.db
      .select()
      .from(challenges)
      .where(eq(challenges.slug, 'pause-before-react'));
    expect(challengeRows).toHaveLength(1);
    expect(challengeRows[0]?.status).toBe('published');
    expect(challengeRows[0]?.pathwayId).toBeTruthy();
  });
});
