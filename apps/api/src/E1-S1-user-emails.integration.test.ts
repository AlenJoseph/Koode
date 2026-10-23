/**
 * E1-S1 independent suite: multi-email model — happy + negative paths.
 * Does not depend on other epic e2e suites.
 */
import { createDatabase, userEmails, users } from '@koode/database';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { AuthError } from './auth/errors.js';
import { createEmailService } from './identity/emails.js';
import { testConfig } from './test-config.js';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('E1-S1 user emails', () => {
  const config = testConfig(databaseUrl!);
  const database = createDatabase(config.databaseUrl);
  const emails = createEmailService(database);

  afterAll(async () => {
    await database.client.end({ timeout: 5 });
  });

  it('happy: attaches a primary verified email to a new user', async () => {
    const stamp = Date.now();
    const [user] = await database.db.insert(users).values({ role: 'teacher' }).returning();
    expect(user).toBeTruthy();

    const primary = await emails.addVerifiedEmail(user!.id, `Primary-${stamp}@Example.COM`, {
      primary: true,
    });
    expect(primary.email).toBe(`primary-${stamp}@example.com`);
    expect(primary.isPrimary).toBe(true);

    expect(await emails.getPrimaryEmail(user!.id)).toBe(primary.email);
    expect(await emails.findUserIdByEmail(primary.email)).toBe(user!.id);

    const listed = await emails.listEmails(user!.id);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.verifiedAt).toBeTruthy();
  });

  it('happy: verified secondary (non-primary) is findable and does not steal primary', async () => {
    const stamp = Date.now();
    const [user] = await database.db.insert(users).values({ role: 'student' }).returning();
    const primary = await emails.addVerifiedEmail(user!.id, `main-${stamp}@example.com`, {
      primary: true,
    });
    const secondary = await emails.addVerifiedEmail(user!.id, `alt-${stamp}@example.com`, {
      primary: false,
    });

    expect(secondary.isPrimary).toBe(false);
    expect(await emails.getPrimaryEmail(user!.id)).toBe(primary.email);
    expect(await emails.findUserIdByEmail(secondary.email)).toBe(user!.id);

    const listed = await emails.listEmails(user!.id);
    expect(listed).toHaveLength(2);
    expect(listed.every((row) => row.verifiedAt != null)).toBe(true);
  });

  it('happy: switching primary keeps exactly one primary', async () => {
    const stamp = Date.now();
    const [user] = await database.db.insert(users).values({ role: 'student' }).returning();
    const first = await emails.addVerifiedEmail(user!.id, `a-${stamp}@example.com`, {
      primary: true,
    });
    const second = await emails.addVerifiedEmail(user!.id, `b-${stamp}@example.com`, {
      primary: true,
    });

    expect(second.isPrimary).toBe(true);
    expect(await emails.getPrimaryEmail(user!.id)).toBe(second.email);

    const rows = await database.db.query.userEmails.findMany({
      where: eq(userEmails.userId, user!.id),
    });
    expect(rows.filter((row) => row.isPrimary)).toHaveLength(1);
    expect(rows.find((row) => row.email === first.email)?.isPrimary).toBe(false);
  });


  it('negative: same email cannot belong to two users', async () => {
    const stamp = Date.now();
    const shared = `shared-${stamp}@example.com`;
    const [userA] = await database.db.insert(users).values({ role: 'teacher' }).returning();
    const [userB] = await database.db.insert(users).values({ role: 'teacher' }).returning();

    await emails.addVerifiedEmail(userA!.id, shared, { primary: true });

    let caught: unknown;
    try {
      await emails.addVerifiedEmail(userB!.id, shared, { primary: true });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AuthError);
    expect((caught as AuthError).statusCode).toBe(409);

    expect(await emails.findUserIdByEmail(shared)).toBe(userA!.id);
  });

  it('negative: unknown user cannot receive an email', async () => {
    let caught: unknown;
    try {
      await emails.addVerifiedEmail('00000000-0000-4000-8000-000000000000', 'ghost@example.com', {
        primary: true,
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AuthError);
    expect((caught as AuthError).statusCode).toBe(404);
  });
});

