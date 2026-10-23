import {
  type Locale,
  type SessionUser,
  magicLinkRequestSchema,
  magicLinkVerifySchema,
} from '@koode/contracts';
import {
  consentRecords,
  learnerProfiles,
  magicLinkTokens,
  sectionStudents,
  sessions,
  users,
  type Database,
} from '@koode/database';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { ApiConfig } from '../config.js';
import { createOpaqueToken, hashToken } from '../crypto.js';

export class AuthError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function createAuthService(database: Database, config: ApiConfig) {
  const { db } = database;

  async function ensureTeacher(email: string, preferredLocale: Locale = 'en') {
    return db.transaction(async (tx) => {
      const existing = await tx.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (existing) {
        if (existing.role !== 'teacher') {
          throw new AuthError('This email belongs to a student account', 403);
        }
        return existing;
      }

      const [created] = await tx.insert(users).values({ email, role: 'teacher' }).returning();
      if (!created) {
        throw new AuthError('Failed to create user', 500);
      }

      await tx.insert(learnerProfiles).values({
        userId: created.id,
        preferredLocale,
      });
      await tx.insert(consentRecords).values({
        userId: created.id,
        consentType: 'terms_of_use_stub',
        granted: true,
      });
      return created;
    });
  }

  async function toSessionUser(userId: string): Promise<SessionUser> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) {
      throw new AuthError('Unauthorized', 401);
    }
    const profile = await db.query.learnerProfiles.findFirst({
      where: eq(learnerProfiles.userId, userId),
    });
    const membership = await db.query.sectionStudents.findFirst({
      where: eq(sectionStudents.userId, userId),
    });
    const preferredLocale = (profile?.preferredLocale === 'ml' ? 'ml' : 'en') as Locale;
    const role = user.role === 'student' ? 'student' : 'teacher';
    return {
      id: user.id,
      email: user.email ?? null,
      role,
      preferredLocale,
      displayName: membership?.displayName ?? profile?.displayName ?? null,
      sectionId: membership?.sectionId ?? null,
    };
  }

  return {
    toSessionUser,

    async requestMagicLink(input: unknown) {
      const { email } = magicLinkRequestSchema.parse(input);
      const normalized = email.toLowerCase();
      const token = createOpaqueToken();
      const expiresAt = new Date(Date.now() + config.magicLinkTtlMs);

      await db.insert(magicLinkTokens).values({
        email: normalized,
        tokenHash: hashToken(token),
        expiresAt,
      });

      const verifyUrl = new URL('/auth/verify', config.appOrigin);
      verifyUrl.searchParams.set('token', token);

      return {
        ok: true as const,
        email: normalized,
        ...(config.magicLinkDevMode ? { devToken: token, devVerifyUrl: verifyUrl.toString() } : {}),
      };
    },

    async verifyMagicLink(input: unknown) {
      const { token } = magicLinkVerifySchema.parse(input);
      const tokenHash = hashToken(token);
      const now = new Date();

      const [record] = await db
        .update(magicLinkTokens)
        .set({ usedAt: now })
        .where(
          and(
            eq(magicLinkTokens.tokenHash, tokenHash),
            isNull(magicLinkTokens.usedAt),
            gt(magicLinkTokens.expiresAt, now),
          ),
        )
        .returning();

      if (!record) {
        throw new AuthError('Invalid or expired magic link', 401);
      }

      const user = await ensureTeacher(record.email);
      const sessionToken = createOpaqueToken();
      const expiresAt = new Date(Date.now() + config.sessionTtlMs);

      await db.insert(sessions).values({
        userId: user.id,
        tokenHash: hashToken(sessionToken),
        expiresAt,
      });

      const sessionUser = await toSessionUser(user.id);
      return { sessionToken, expiresAt, user: sessionUser };
    },

    async createSessionForUser(userId: string) {
      const sessionToken = createOpaqueToken();
      const expiresAt = new Date(Date.now() + config.sessionTtlMs);
      await db.insert(sessions).values({
        userId,
        tokenHash: hashToken(sessionToken),
        expiresAt,
      });
      const user = await toSessionUser(userId);
      return { sessionToken, expiresAt, user };
    },

    async getUserForSessionToken(sessionToken: string): Promise<SessionUser | null> {
      const now = new Date();
      const session = await db.query.sessions.findFirst({
        where: and(eq(sessions.tokenHash, hashToken(sessionToken)), gt(sessions.expiresAt, now)),
      });
      if (!session) {
        return null;
      }
      return toSessionUser(session.userId);
    },

    async revokeSession(sessionToken: string): Promise<void> {
      await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(sessionToken)));
    },

    requireTeacher(user: SessionUser): void {
      if (user.role !== 'teacher') {
        throw new AuthError('Teachers only', 403);
      }
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
