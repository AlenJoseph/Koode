import {
  createPathwaySchema,
  updatePathwaySchema,
  type CreatePathwayInput,
  type UpdatePathwayInput,
} from '@koode/contracts';
import { pathways, type Database } from '@koode/database';
import { desc, eq, ne } from 'drizzle-orm';
import { AuthError } from '../auth/errors.js';

export type PathwayRow = {
  id: string;
  slug: string | null;
  title: string;
  summary: string;
  locale: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

function toPublic(row: PathwayRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    locale: row.locale,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
  };
}

export function createPathwayService(database: Database) {
  const { db } = database;

  return {
    async list(options?: { includeArchived?: boolean }) {
      const rows = options?.includeArchived
        ? await db.select().from(pathways).orderBy(desc(pathways.updatedAt))
        : await db
            .select()
            .from(pathways)
            .where(ne(pathways.status, 'archived'))
            .orderBy(desc(pathways.updatedAt));
      return rows.map(toPublic);
    },

    async create(adminUserId: string, input: unknown) {
      const data: CreatePathwayInput = createPathwaySchema.parse(input);
      const [row] = await db
        .insert(pathways)
        .values({
          title: data.title,
          summary: data.summary ?? '',
          locale: data.locale ?? 'en',
          status: 'draft',
          createdByUserId: adminUserId,
        })
        .returning();
      if (!row) {
        throw new AuthError('Failed to create pathway', 500);
      }
      return toPublic(row);
    },

    async update(pathwayId: string, input: unknown) {
      const data: UpdatePathwayInput = updatePathwaySchema.parse(input);
      const existing = await db.query.pathways.findFirst({
        where: eq(pathways.id, pathwayId),
      });
      if (!existing) {
        throw new AuthError('Pathway not found', 404);
      }
      if (existing.status === 'archived') {
        throw new AuthError('Archived pathway cannot be updated', 409);
      }

      const [row] = await db
        .update(pathways)
        .set({
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.summary !== undefined ? { summary: data.summary } : {}),
          ...(data.locale !== undefined ? { locale: data.locale } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          updatedAt: new Date(),
        })
        .where(eq(pathways.id, pathwayId))
        .returning();
      if (!row) {
        throw new AuthError('Pathway not found', 404);
      }
      return toPublic(row);
    },

    async archive(pathwayId: string) {
      const existing = await db.query.pathways.findFirst({
        where: eq(pathways.id, pathwayId),
      });
      if (!existing) {
        throw new AuthError('Pathway not found', 404);
      }
      if (existing.status === 'archived') {
        return toPublic(existing);
      }
      const now = new Date();
      const [row] = await db
        .update(pathways)
        .set({ status: 'archived', archivedAt: now, updatedAt: now })
        .where(eq(pathways.id, pathwayId))
        .returning();
      if (!row) {
        throw new AuthError('Pathway not found', 404);
      }
      return toPublic(row);
    },
  };
}

export type PathwayService = ReturnType<typeof createPathwayService>;
