import {
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from '@koode/contracts';
import { challenges, pathways, projects, type Database } from '@koode/database';
import { and, desc, eq } from 'drizzle-orm';
import { AuthError } from '../auth/errors.js';

function toPublic(row: {
  id: string;
  title: string;
  summary: string;
  pathwayId: string | null;
  challengeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    pathwayId: row.pathwayId,
    challengeId: row.challengeId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createProjectService(database: Database) {
  const { db } = database;

  async function assertOptionalLinks(input: {
    pathwayId?: string | null;
    challengeId?: string | null;
  }) {
    if (input.pathwayId) {
      const pathway = await db.query.pathways.findFirst({
        where: eq(pathways.id, input.pathwayId),
      });
      if (!pathway || pathway.status === 'archived') {
        throw new AuthError('Pathway not found', 404);
      }
    }
    if (input.challengeId) {
      const challenge = await db.query.challenges.findFirst({
        where: eq(challenges.id, input.challengeId),
      });
      if (!challenge || challenge.status === 'archived') {
        throw new AuthError('Challenge not found', 404);
      }
    }
  }

  return {
    async listForUser(userId: string) {
      const rows = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.updatedAt));
      return rows.map(toPublic);
    },

    async create(userId: string, input: unknown) {
      const data: CreateProjectInput = createProjectSchema.parse(input);
      await assertOptionalLinks({
        pathwayId: data.pathwayId,
        challengeId: data.challengeId,
      });
      const [row] = await db
        .insert(projects)
        .values({
          userId,
          title: data.title,
          summary: data.summary ?? '',
          pathwayId: data.pathwayId ?? null,
          challengeId: data.challengeId ?? null,
        })
        .returning();
      if (!row) {
        throw new AuthError('Failed to create project', 500);
      }
      return toPublic(row);
    },

    async update(userId: string, projectId: string, input: unknown) {
      const data: UpdateProjectInput = updateProjectSchema.parse(input);
      const existing = await db.query.projects.findFirst({
        where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
      });
      if (!existing) {
        throw new AuthError('Project not found', 404);
      }
      if (data.pathwayId !== undefined || data.challengeId !== undefined) {
        await assertOptionalLinks({
          pathwayId: data.pathwayId,
          challengeId: data.challengeId,
        });
      }

      const [row] = await db
        .update(projects)
        .set({
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.summary !== undefined ? { summary: data.summary } : {}),
          ...(data.pathwayId !== undefined ? { pathwayId: data.pathwayId } : {}),
          ...(data.challengeId !== undefined ? { challengeId: data.challengeId } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        .returning();
      if (!row) {
        throw new AuthError('Project not found', 404);
      }
      return toPublic(row);
    },
  };
}

export type ProjectService = ReturnType<typeof createProjectService>;
