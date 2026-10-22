import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { requireDatabaseUrl } from './client.js';

async function main(): Promise<void> {
  const url = requireDatabaseUrl();
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);
  const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '../drizzle');
  await migrate(db, { migrationsFolder });
  await client.end();
  console.log('Migrations applied');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
