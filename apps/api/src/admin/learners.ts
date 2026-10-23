import {
  challengeAttempts,
  consentRecords,
  learnerProfiles,
  pathwayEnrollments,
  projects,
  tutorTurns,
  userEmails,
  users,
  type Database,
} from '@koode/database';
import { count, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

export class LearnerAdminError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'LearnerAdminError';
  }
}

const userIdSchema = z.string().uuid();

/** Roles that may be exported/deleted via the GDPR-minded learner admin endpoints. */
const DELETABLE_ROLES = new Set(['learner', 'student']);

export function createLearnerAdminService(database: Database) {
  const { db } = database;

  async function loadTarget(userId: string) {
    const parsed = userIdSchema.safeParse(userId);
    if (!parsed.success) {
      throw new LearnerAdminError('Invalid user id', 400);
    }
    const [row] = await db.select().from(users).where(eq(users.id, parsed.data)).limit(1);
    if (!row) {
      throw new LearnerAdminError('User not found', 404);
    }
    if (!DELETABLE_ROLES.has(row.role)) {
      throw new LearnerAdminError('Only learner or student accounts can be exported or deleted here', 403);
    }
    return row;
  }

  return {
    async exportLearner(userId: string) {
      const user = await loadTarget(userId);
      const emails = await db
        .select({
          email: userEmails.email,
          isPrimary: userEmails.isPrimary,
          verifiedAt: userEmails.verifiedAt,
        })
        .from(userEmails)
        .where(eq(userEmails.userId, user.id));

      const [profile] = await db
        .select({
          displayName: learnerProfiles.displayName,
          preferredLocale: learnerProfiles.preferredLocale,
        })
        .from(learnerProfiles)
        .where(eq(learnerProfiles.userId, user.id))
        .limit(1);

      const [enrollmentCount] = await db
        .select({ value: count() })
        .from(pathwayEnrollments)
        .where(eq(pathwayEnrollments.userId, user.id));
      const [attemptCount] = await db
        .select({ value: count() })
        .from(challengeAttempts)
        .where(eq(challengeAttempts.userId, user.id));
      const [projectCount] = await db
        .select({ value: count() })
        .from(projects)
        .where(eq(projects.userId, user.id));
      const [tutorCount] = await db
        .select({ value: count() })
        .from(tutorTurns)
        .where(eq(tutorTurns.userId, user.id));
      const [consentCount] = await db
        .select({ value: count() })
        .from(consentRecords)
        .where(eq(consentRecords.userId, user.id));

      const tutorMeta = await db
        .select({
          id: tutorTurns.id,
          topic: tutorTurns.topic,
          phase: tutorTurns.phase,
          adapterId: tutorTurns.adapterId,
          createdAt: tutorTurns.createdAt,
          // Explicitly omit reply body + learnerMessageHash from export payload shape below.
        })
        .from(tutorTurns)
        .where(eq(tutorTurns.userId, user.id))
        .limit(100);

      return {
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
        },
        emails: emails.map((row) => ({
          email: row.email,
          isPrimary: row.isPrimary,
          verifiedAt: row.verifiedAt?.toISOString() ?? null,
        })),
        profile: profile
          ? {
              displayName: profile.displayName,
              preferredLocale: profile.preferredLocale,
            }
          : null,
        counts: {
          pathwayEnrollments: Number(enrollmentCount?.value ?? 0),
          challengeAttempts: Number(attemptCount?.value ?? 0),
          projects: Number(projectCount?.value ?? 0),
          tutorTurns: Number(tutorCount?.value ?? 0),
          consentRecords: Number(consentCount?.value ?? 0),
        },
        tutorTurnMetadata: tutorMeta.map((row) => ({
          id: row.id,
          topic: row.topic,
          phase: row.phase,
          adapterId: row.adapterId,
          createdAt: row.createdAt.toISOString(),
        })),
      };
    },

    async deleteLearner(userId: string) {
      const user = await loadTarget(userId);
      await db.delete(users).where(eq(users.id, user.id));
      return { deletedUserId: user.id, role: user.role };
    },

    /** Test helper: assert no rows remain for a deleted user. */
    async exists(userId: string): Promise<boolean> {
      const [row] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
      return Boolean(row);
    },

    async emailExists(emails: string[]): Promise<boolean> {
      if (emails.length === 0) return false;
      const rows = await db
        .select({ id: userEmails.id })
        .from(userEmails)
        .where(inArray(userEmails.email, emails))
        .limit(1);
      return rows.length > 0;
    },
  };
}

export type LearnerAdminService = ReturnType<typeof createLearnerAdminService>;
