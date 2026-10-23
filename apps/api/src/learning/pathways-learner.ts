import { pathwayEnrollments, pathways, type Database } from '@koode/database';
import { and, desc, eq } from 'drizzle-orm';
import { AuthError } from '../auth/errors.js';

function toPathwayPublic(row: {
  id: string;
  slug: string | null;
  title: string;
  summary: string;
  locale: string;
  status: string;
}) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    locale: row.locale,
    status: row.status,
  };
}

function toEnrollmentPublic(row: {
  id: string;
  pathwayId: string;
  status: string;
  startedAt: Date;
}) {
  return {
    id: row.id,
    pathwayId: row.pathwayId,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
  };
}

export function createLearnerPathwayService(database: Database) {
  const { db } = database;

  return {
    async listPublished() {
      const rows = await db
        .select()
        .from(pathways)
        .where(eq(pathways.status, 'published'))
        .orderBy(desc(pathways.updatedAt));
      return rows.map(toPathwayPublic);
    },

    async listEnrollments(userId: string) {
      const rows = await db
        .select()
        .from(pathwayEnrollments)
        .where(eq(pathwayEnrollments.userId, userId))
        .orderBy(desc(pathwayEnrollments.startedAt));
      return rows.map(toEnrollmentPublic);
    },

    async startEnrollment(userId: string, pathwayId: string) {
      const pathway = await db.query.pathways.findFirst({
        where: eq(pathways.id, pathwayId),
      });
      if (!pathway || pathway.status !== 'published') {
        throw new AuthError('Pathway not found', 404);
      }

      const existing = await db.query.pathwayEnrollments.findFirst({
        where: and(
          eq(pathwayEnrollments.userId, userId),
          eq(pathwayEnrollments.pathwayId, pathwayId),
        ),
      });
      if (existing) {
        return toEnrollmentPublic(existing);
      }

      const [row] = await db
        .insert(pathwayEnrollments)
        .values({
          userId,
          pathwayId,
          status: 'active',
        })
        .returning();
      if (!row) {
        throw new AuthError('Failed to enroll', 500);
      }
      return toEnrollmentPublic(row);
    },
  };
}

export type LearnerPathwayService = ReturnType<typeof createLearnerPathwayService>;
