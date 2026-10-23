import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lt } from 'drizzle-orm';
import { createDatabase, requireDatabaseUrl, type Database } from './client.js';
import { tutorTurns } from './schema/index.js';

export type PurgeTutorTurnsResult = {
  deleted: number;
  retentionDays: number;
  cutoffIso: string;
};

export function resolveRetentionDays(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.TUTOR_TURN_RETENTION_DAYS;
  if (!raw) {
    return 365;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 365;
}

/**
 * Delete tutor_turns older than retentionDays (default 365).
 * Evidence-only purge — does not delete users or learning progress.
 */
export async function purgeTutorTurnsOlderThan(
  database: Database,
  retentionDays = resolveRetentionDays(),
  now = new Date(),
): Promise<PurgeTutorTurnsResult> {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const deleted = await database.db
    .delete(tutorTurns)
    .where(lt(tutorTurns.createdAt, cutoff))
    .returning({ id: tutorTurns.id });

  return {
    deleted: deleted.length,
    retentionDays,
    cutoffIso: cutoff.toISOString(),
  };
}

function loadRootEnv(): void {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
  try {
    const text = readFileSync(join(root, '.env'), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
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
    // optional
  }
}

async function main(): Promise<void> {
  loadRootEnv();
  const database = createDatabase(requireDatabaseUrl());
  try {
    const result = await purgeTutorTurnsOlderThan(database);
    console.log(
      `Purged ${result.deleted} tutor turns older than ${result.retentionDays} days (cutoff ${result.cutoffIso})`,
    );
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
