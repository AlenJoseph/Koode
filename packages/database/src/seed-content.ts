import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  contentCatalogSchema,
  contentChallengeSchema,
  contentPathwaySchema,
} from '@koode/contracts';
import { eq } from 'drizzle-orm';
import { createDatabase, requireDatabaseUrl, type Database } from './client.js';
import { challenges, pathways } from './schema/index.js';

export type SeedContentResult = {
  pathwaysUpserted: number;
  challengesUpserted: number;
  pathwaySlugs: string[];
  challengeSlugs: string[];
};

function defaultContentRoot(): string {
  if (process.env.CONTENT_ROOT) {
    return process.env.CONTENT_ROOT;
  }
  return join(dirname(fileURLToPath(import.meta.url)), '../../../content');
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

/**
 * Upsert pathway/challenge shells from `content/` manuals by stable slug.
 * Idempotent — safe to re-run. Sets status to published.
 */
export async function seedContentManuals(
  database: Database,
  contentRoot = defaultContentRoot(),
): Promise<SeedContentResult> {
  const { db } = database;
  const catalog = contentCatalogSchema.parse(readJson(join(contentRoot, 'catalog.json')));
  const pathwaySlugs: string[] = [];
  const challengeSlugs: string[] = [];

  for (const pathwayId of catalog.pathways) {
    const pathwayPath = join(contentRoot, 'pathways', pathwayId, 'pathway.json');
    const manual = contentPathwaySchema.parse(readJson(pathwayPath));
    const existing = await db.query.pathways.findFirst({
      where: eq(pathways.slug, manual.id),
    });

    let pathwayDbId: string;
    if (existing) {
      const [row] = await db
        .update(pathways)
        .set({
          title: manual.title,
          summary: manual.promise,
          locale: manual.locale,
          status: 'published',
          archivedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(pathways.id, existing.id))
        .returning();
      pathwayDbId = row!.id;
    } else {
      const [row] = await db
        .insert(pathways)
        .values({
          slug: manual.id,
          title: manual.title,
          summary: manual.promise,
          locale: manual.locale,
          status: 'published',
        })
        .returning();
      pathwayDbId = row!.id;
    }
    pathwaySlugs.push(manual.id);

    for (const challengeId of manual.challengeOrder) {
      const challengePath = join(
        contentRoot,
        'pathways',
        pathwayId,
        'challenges',
        `${challengeId}.json`,
      );
      const challenge = contentChallengeSchema.parse(readJson(challengePath));
      const existingChallenge = await db.query.challenges.findFirst({
        where: eq(challenges.slug, challenge.id),
      });

      if (existingChallenge) {
        await db
          .update(challenges)
          .set({
            title: challenge.title,
            summary: challenge.summary,
            locale: challenge.locale,
            status: 'published',
            pathwayId: pathwayDbId,
            archivedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(challenges.id, existingChallenge.id));
      } else {
        await db.insert(challenges).values({
          slug: challenge.id,
          title: challenge.title,
          summary: challenge.summary,
          locale: challenge.locale,
          status: 'published',
          pathwayId: pathwayDbId,
        });
      }
      challengeSlugs.push(challenge.id);
    }
  }

  return {
    pathwaysUpserted: pathwaySlugs.length,
    challengesUpserted: challengeSlugs.length,
    pathwaySlugs,
    challengeSlugs,
  };
}

function loadRootEnv(): void {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
  try {
    const envPath = join(root, '.env');
    const text = readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional .env
  }
}

async function main(): Promise<void> {
  loadRootEnv();
  const database = createDatabase(requireDatabaseUrl());
  try {
    const result = await seedContentManuals(database);
    console.log(
      `Seeded ${result.pathwaysUpserted} pathways, ${result.challengesUpserted} challenges`,
    );
    console.log(`Pathways: ${result.pathwaySlugs.join(', ')}`);
  } finally {
    await database.client.end({ timeout: 5 });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
