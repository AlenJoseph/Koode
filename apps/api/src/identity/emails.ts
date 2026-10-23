import { userEmails, users, type Database } from '@koode/database';
import { and, eq } from 'drizzle-orm';
import { AuthError } from '../auth/errors.js';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    if ('code' in current && String((current as { code: unknown }).code) === '23505') {
      return true;
    }
    current = 'cause' in current ? (current as { cause: unknown }).cause : undefined;
  }
  return false;
}

export function createEmailService(database: Database) {
  const { db } = database;

  return {
    async findUserIdByEmail(email: string): Promise<string | null> {
      const normalized = normalizeEmail(email);
      const row = await db.query.userEmails.findFirst({
        where: eq(userEmails.email, normalized),
      });
      return row?.userId ?? null;
    },

    async getPrimaryEmail(userId: string): Promise<string | null> {
      const row = await db.query.userEmails.findFirst({
        where: and(eq(userEmails.userId, userId), eq(userEmails.isPrimary, true)),
      });
      return row?.email ?? null;
    },

    async listEmails(userId: string) {
      return db.query.userEmails.findMany({
        where: eq(userEmails.userId, userId),
      });
    },

    /**
     * Attach a verified email to a user. Enforces global uniqueness and
     * at-most-one primary (caller sets primary when appropriate).
     */
    async addVerifiedEmail(
      userId: string,
      email: string,
      options: { primary: boolean },
    ): Promise<{ id: string; email: string; isPrimary: boolean }> {
      const normalized = normalizeEmail(email);
      const existing = await db.query.userEmails.findFirst({
        where: eq(userEmails.email, normalized),
      });
      if (existing) {
        if (existing.userId === userId) {
          return {
            id: existing.id,
            email: existing.email,
            isPrimary: existing.isPrimary,
          };
        }
        throw new AuthError('Email already linked to another account', 409);
      }

      const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!user) {
        throw new AuthError('User not found', 404);
      }

      try {
        return await db.transaction(async (tx) => {
          if (options.primary) {
            await tx
              .update(userEmails)
              .set({ isPrimary: false })
              .where(and(eq(userEmails.userId, userId), eq(userEmails.isPrimary, true)));
          }

          const [created] = await tx
            .insert(userEmails)
            .values({
              userId,
              email: normalized,
              isPrimary: options.primary,
              verifiedAt: new Date(),
            })
            .returning();

          if (!created) {
            throw new AuthError('Failed to add email', 500);
          }

          return {
            id: created.id,
            email: created.email,
            isPrimary: created.isPrimary,
          };
        });
      } catch (error) {
        if (error instanceof AuthError) {
          throw error;
        }
        if (isUniqueViolation(error)) {
          throw new AuthError('Email already linked to another account', 409);
        }
        throw error;
      }
    },

    async setPrimaryEmail(userId: string, emailId: string) {
      const row = await db.query.userEmails.findFirst({
        where: and(eq(userEmails.id, emailId), eq(userEmails.userId, userId)),
      });
      if (!row) {
        throw new AuthError('Email not found', 404);
      }
      if (!row.verifiedAt) {
        throw new AuthError('Email is not verified', 400);
      }

      await db.transaction(async (tx) => {
        await tx
          .update(userEmails)
          .set({ isPrimary: false })
          .where(and(eq(userEmails.userId, userId), eq(userEmails.isPrimary, true)));
        await tx
          .update(userEmails)
          .set({ isPrimary: true })
          .where(and(eq(userEmails.id, emailId), eq(userEmails.userId, userId)));
      });

      return { id: row.id, email: row.email, isPrimary: true };
    },

    async removeEmail(userId: string, emailId: string) {
      const rows = await db.query.userEmails.findMany({
        where: eq(userEmails.userId, userId),
      });
      const target = rows.find((row) => row.id === emailId);
      if (!target) {
        throw new AuthError('Email not found', 404);
      }
      if (rows.length <= 1) {
        throw new AuthError('Cannot remove the last verified email', 400);
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(userEmails)
          .where(and(eq(userEmails.id, emailId), eq(userEmails.userId, userId)));
        if (target.isPrimary) {
          const remaining = rows.filter((row) => row.id !== emailId);
          const next = remaining[0];
          if (next) {
            await tx
              .update(userEmails)
              .set({ isPrimary: true })
              .where(and(eq(userEmails.id, next.id), eq(userEmails.userId, userId)));
          }
        }
      });

      return { ok: true as const };
    },
  };
}

export type EmailService = ReturnType<typeof createEmailService>;
