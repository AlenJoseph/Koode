/**
 * E1-S1 database-level suite: uniqueness constraints on user_emails.
 * Independent of API e2e; skips when DATABASE_URL is unset.
 */
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../client.js';
import { userEmails, users } from './index.js';

const databaseUrl = process.env.DATABASE_URL;

function isPgUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    if ('code' in current && String((current as { code: unknown }).code) === '23505') {
      return true;
    }
    current = 'cause' in current ? (current as { cause: unknown }).cause : undefined;
  }
  return false;
}

describe.runIf(Boolean(databaseUrl))('E1-S1 user_emails constraints', () => {
  const database = createDatabase(databaseUrl!);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  it('rejects duplicate email at the database unique index', async () => {
    const stamp = Date.now();
    const shared = `db-dup-${stamp}@example.com`;
    const [userA] = await database.db.insert(users).values({ role: 'teacher' }).returning();
    const [userB] = await database.db.insert(users).values({ role: 'teacher' }).returning();

    await database.db.insert(userEmails).values({
      userId: userA!.id,
      email: shared,
      isPrimary: true,
      verifiedAt: new Date(),
    });

    await expect(
      database.db.insert(userEmails).values({
        userId: userB!.id,
        email: shared,
        isPrimary: true,
        verifiedAt: new Date(),
      }),
    ).rejects.toSatisfy((error: unknown) => isPgUniqueViolation(error));
  });

  it('rejects a second primary email for the same user', async () => {
    const stamp = Date.now();
    const [user] = await database.db.insert(users).values({ role: 'teacher' }).returning();

    await database.db.insert(userEmails).values({
      userId: user!.id,
      email: `p1-${stamp}@example.com`,
      isPrimary: true,
      verifiedAt: new Date(),
    });

    await expect(
      database.db.insert(userEmails).values({
        userId: user!.id,
        email: `p2-${stamp}@example.com`,
        isPrimary: true,
        verifiedAt: new Date(),
      }),
    ).rejects.toSatisfy((error: unknown) => isPgUniqueViolation(error));
  });


  it('allows primary + verified secondary on the same user', async () => {
    const stamp = Date.now();
    const [user] = await database.db.insert(users).values({ role: 'student' }).returning();

    await database.db.insert(userEmails).values({
      userId: user!.id,
      email: `primary-${stamp}@example.com`,
      isPrimary: true,
      verifiedAt: new Date(),
    });
    await database.db.insert(userEmails).values({
      userId: user!.id,
      email: `secondary-${stamp}@example.com`,
      isPrimary: false,
      verifiedAt: new Date(),
    });

    const rows = await database.db.query.userEmails.findMany({
      where: eq(userEmails.userId, user!.id),
    });

    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.isPrimary)).toHaveLength(1);
  });
});
