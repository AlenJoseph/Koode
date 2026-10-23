import {
  createChallengeSchema,
  updateChallengeSchema,
  type CreateChallengeInput,
  type UpdateChallengeInput,
} from '@koode/contracts';
import { challenges, pathways, type Database } from '@koode/database';
import { desc, eq, ne } from 'drizzle-orm';
import { AuthError } from '../auth/errors.js';

export type ChallengeRow = {
  id: string;
  slug: string | null;
  title: string;
  summary: string;
  locale: string;
  status: string;
  pathwayId: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

function toPublic(row: ChallengeRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    locale: row.locale,
    status: row.status,
    pathwayId: row.pathwayId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
  };
}

export function createChallengeService(database: Database) {
  const { db } = database;

  async function assertPathwayExists(pathwayId: string | null | undefined) {
    if (!pathwayId) {
      return;
    }
    const pathway = await db.query.pathways.findFirst({
      where: eq(pathways.id, pathwayId),
    });
    if (!pathway || pathway.status === 'archived') {
      throw new AuthError('Pathway not found', 404);
    }
  }

  return {
    async list(options?: { includeArchived?: boolean }) {
      const rows = options?.includeArchived
        ? await db.select().from(challenges).orderBy(desc(challenges.updatedAt))
        : await db
            .select()
            .from(challenges)
            .where(ne(challenges.status, 'archived'))
            .orderBy(desc(challenges.updatedAt));
      return rows.map(toPublic);
    },

    async create(adminUserId: string, input: unknown) {
      const data: CreateChallengeInput = createChallengeSchema.parse(input);
      const pathwayId = data.pathwayId ?? null;
      await assertPathwayExists(pathwayId);

      const [row] = await db
        .insert(challenges)
        .values({
          title: data.title,
          summary: data.summary ?? '',
          locale: data.locale ?? 'en',
          status: 'draft',
          pathwayId,
          createdByUserId: adminUserId,
        })
        .returning();
      if (!row) {
        throw new AuthError('Failed to create challenge', 500);
      }
      return toPublic(row);
    },

    async update(challengeId: string, input: unknown) {
      const data: UpdateChallengeInput = updateChallengeSchema.parse(input);
      const existing = await db.query.challenges.findFirst({
        where: eq(challenges.id, challengeId),
      });
      if (!existing) {
        throw new AuthError('Challenge not found', 404);
      }
      if (existing.status === 'archived') {
        throw new AuthError('Archived challenge cannot be updated', 409);
      }
      if (data.pathwayId !== undefined) {
        await assertPathwayExists(data.pathwayId);
      }

      const [row] = await db
        .update(challenges)
        .set({
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.summary !== undefined ? { summary: data.summary } : {}),
          ...(data.locale !== undefined ? { locale: data.locale } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.pathwayId !== undefined ? { pathwayId: data.pathwayId } : {}),
          updatedAt: new Date(),
        })
        .where(eq(challenges.id, challengeId))
        .returning();
      if (!row) {
        throw new AuthError('Challenge not found', 404);
      }
      return toPublic(row);
    },

    async archive(challengeId: string) {
      const existing = await db.query.challenges.findFirst({
        where: eq(challenges.id, challengeId),
      });
      if (!existing) {
        throw new AuthError('Challenge not found', 404);
      }
      if (existing.status === 'archived') {
        return toPublic(existing);
      }
      const now = new Date();
      const [row] = await db
        .update(challenges)
        .set({ status: 'archived', archivedAt: now, updatedAt: now })
        .where(eq(challenges.id, challengeId))
        .returning();
      if (!row) {
        throw new AuthError('Challenge not found', 404);
      }
      return toPublic(row);
    },
  };
}

export type ChallengeService = ReturnType<typeof createChallengeService>;
