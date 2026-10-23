import {
  type Locale,
  type MagicLinkIntent,
  type SessionUser,
  type UserRole,
  claimEmailRequestSchema,
  magicLinkRequestSchema,
  magicLinkVerifySchema,
} from '@koode/contracts';

import {
  consentRecords,
  learnerProfiles,
  magicLinkTokens,
  sectionStudents,
  sessions,
  userEmails,
  users,
  type Database,
} from '@koode/database';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { ApiConfig } from '../config.js';
import { createOpaqueToken, hashToken } from '../crypto.js';
import { createEmailService, normalizeEmail } from '../identity/emails.js';
import { AuthError } from './errors.js';

export { AuthError } from './errors.js';

function asSessionRole(role: string): UserRole {
  if (role === 'student' || role === 'learner' || role === 'teacher') {
    return role;
  }
  return 'teacher';
}

export function createAuthService(database: Database, config: ApiConfig) {
  const { db } = database;
  const emails = createEmailService(database);

  async function createAccountWithPrimaryEmail(input: {
    role: 'teacher' | 'learner';
    email: string;
    preferredLocale: Locale;
  }) {
    const normalized = normalizeEmail(input.email);
    try {
      return await db.transaction(async (tx) => {
        const [created] = await tx.insert(users).values({ role: input.role }).returning();
        if (!created) {
          throw new AuthError('Failed to create user', 500);
        }

        await tx.insert(learnerProfiles).values({
          userId: created.id,
          preferredLocale: input.preferredLocale,
        });
        await tx.insert(consentRecords).values({
          userId: created.id,
          consentType: 'terms_of_use_stub',
          granted: true,
        });
        await tx.insert(userEmails).values({
          userId: created.id,
          email: normalized,
          isPrimary: true,
          verifiedAt: new Date(),
        });

        return created;
      });
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      const racedId = await emails.findUserIdByEmail(normalized);
      if (racedId) {
        const raced = await db.query.users.findFirst({ where: eq(users.id, racedId) });
        if (raced) {
          return raced;
        }
      }
      throw error;
    }
  }

  async function ensureTeacher(email: string, preferredLocale: Locale = 'en') {
    const normalized = normalizeEmail(email);
    const existingId = await emails.findUserIdByEmail(normalized);
    if (existingId) {
      const existing = await db.query.users.findFirst({
        where: eq(users.id, existingId),
      });
      if (!existing) {
        throw new AuthError('User not found for email', 500);
      }
      if (existing.role !== 'teacher') {
        throw new AuthError('This email belongs to a learner or student account', 403);
      }
      return existing;
    }
    return createAccountWithPrimaryEmail({
      role: 'teacher',
      email: normalized,
      preferredLocale,
    });
  }

  async function ensureLearner(email: string, preferredLocale: Locale = 'en') {
    const normalized = normalizeEmail(email);
    const existingId = await emails.findUserIdByEmail(normalized);
    if (existingId) {
      const existing = await db.query.users.findFirst({
        where: eq(users.id, existingId),
      });
      if (!existing) {
        throw new AuthError('User not found for email', 500);
      }
      if (existing.role === 'teacher') {
        throw new AuthError('This email belongs to a teacher account', 403);
      }
      // Classroom students who already claimed this email sign in on the same account.
      if (existing.role === 'student' || existing.role === 'learner') {
        return existing;
      }
      throw new AuthError('This email cannot sign in as a learner', 403);
    }
    return createAccountWithPrimaryEmail({
      role: 'learner',
      email: normalized,
      preferredLocale,
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
    const primaryEmail = await emails.getPrimaryEmail(userId);
    return {
      id: user.id,
      email: primaryEmail,
      role: asSessionRole(user.role),
      preferredLocale,
      displayName: membership?.displayName ?? profile?.displayName ?? null,
      sectionId: membership?.sectionId ?? null,
    };
  }

  return {
    toSessionUser,
    emails,

    async requestMagicLink(input: unknown) {
      const parsed = magicLinkRequestSchema.parse(input);
      if (parsed.intent === 'claim') {
        throw new AuthError('Use the claim-email endpoint while signed in', 400);
      }
      const normalized = normalizeEmail(parsed.email);
      const intent: MagicLinkIntent = parsed.intent;
      const token = createOpaqueToken();
      const expiresAt = new Date(Date.now() + config.magicLinkTtlMs);

      await db.insert(magicLinkTokens).values({
        email: normalized,
        intent,
        tokenHash: hashToken(token),
        expiresAt,
      });

      const verifyUrl = new URL('/auth/verify', config.appOrigin);
      verifyUrl.searchParams.set('token', token);

      return {
        ok: true as const,
        email: normalized,
        intent,
        ...(config.magicLinkDevMode ? { devToken: token, devVerifyUrl: verifyUrl.toString() } : {}),
      };
    },

    async requestClaimEmail(userId: string, input: unknown) {
      const { email } = claimEmailRequestSchema.parse(input);
      const normalized = normalizeEmail(email);
      const existing = await emails.findUserIdByEmail(normalized);
      if (existing && existing !== userId) {
        throw new AuthError('Email already linked to another account', 409);
      }
      if (existing === userId) {
        throw new AuthError('Email already linked to this account', 409);
      }

      const token = createOpaqueToken();
      const expiresAt = new Date(Date.now() + config.magicLinkTtlMs);
      await db.insert(magicLinkTokens).values({
        email: normalized,
        intent: 'claim',
        claimUserId: userId,
        tokenHash: hashToken(token),
        expiresAt,
      });

      const verifyUrl = new URL('/auth/verify', config.appOrigin);
      verifyUrl.searchParams.set('token', token);

      return {
        ok: true as const,
        email: normalized,
        intent: 'claim' as const,
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

      let userId: string;
      if (record.intent === 'claim') {
        if (!record.claimUserId) {
          throw new AuthError('Invalid claim link', 400);
        }
        const hasPrimary = await emails.getPrimaryEmail(record.claimUserId);
        await emails.addVerifiedEmail(record.claimUserId, record.email, {
          primary: !hasPrimary,
        });
        userId = record.claimUserId;
      } else if (record.intent === 'learner') {
        const user = await ensureLearner(record.email);
        userId = user.id;
      } else {
        const user = await ensureTeacher(record.email);
        userId = user.id;
      }

      const sessionToken = createOpaqueToken();
      const expiresAt = new Date(Date.now() + config.sessionTtlMs);

      await db.insert(sessions).values({
        userId,
        tokenHash: hashToken(sessionToken),
        expiresAt,
      });

      const sessionUser = await toSessionUser(userId);
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
