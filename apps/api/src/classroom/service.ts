import {
  addSectionStudentSchema,
  createSectionSchema,
  sectionLookupSchema,
  setSectionPathwaysSchema,
  studentSignInSchema,
} from '@koode/contracts';
import {
  consentRecords,
  learnerProfiles,
  pathways,
  sectionPathways,
  sectionStudents,
  sections,
  users,
  type Database,
} from '@koode/database';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { AuthError } from '../auth/service.js';
import { hashToken } from '../crypto.js';
import { generateSecretWords, normalizeSecretWords } from '../lib/secret-words.js';
import { generateSectionCode } from '../lib/section-code.js';

/** Soft cap for classroom sections (Code.org-style scale). */
export const MAX_SECTION_STUDENTS = 50;

export function createClassroomService(database: Database) {
  const { db } = database;

  async function uniqueSectionCode(): Promise<string> {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const code = generateSectionCode();
      const existing = await db.query.sections.findFirst({
        where: eq(sections.code, code),
      });
      if (!existing) {
        return code;
      }
    }
    throw new AuthError('Could not allocate section code', 500);
  }

  return {
    async createSection(teacherId: string, input: unknown) {
      const { name } = createSectionSchema.parse(input);
      const code = await uniqueSectionCode();
      const [section] = await db.insert(sections).values({ teacherId, name, code }).returning();
      if (!section) {
        throw new AuthError('Failed to create section', 500);
      }
      return section;
    },

    async listTeacherSections(teacherId: string) {
      return db.query.sections.findMany({
        where: eq(sections.teacherId, teacherId),
      });
    },

    async getSectionForTeacher(teacherId: string, sectionId: string) {
      const section = await db.query.sections.findFirst({
        where: and(eq(sections.id, sectionId), eq(sections.teacherId, teacherId)),
      });
      if (!section) {
        throw new AuthError('Section not found', 404);
      }
      return section;
    },

    async listSectionPathways(teacherId: string, sectionId: string) {
      await this.getSectionForTeacher(teacherId, sectionId);
      const links = await db.query.sectionPathways.findMany({
        where: eq(sectionPathways.sectionId, sectionId),
      });
      if (links.length === 0) {
        return [];
      }
      const rows = await db
        .select()
        .from(pathways)
        .where(
          inArray(
            pathways.id,
            links.map((link) => link.pathwayId),
          ),
        );
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        summary: row.summary,
        status: row.status,
      }));
    },

    async setSectionPathways(teacherId: string, sectionId: string, input: unknown) {
      const { pathwayIds } = setSectionPathwaysSchema.parse(input);
      await this.getSectionForTeacher(teacherId, sectionId);

      if (pathwayIds.length > 0) {
        const found = await db
          .select({ id: pathways.id })
          .from(pathways)
          .where(inArray(pathways.id, pathwayIds));
        if (found.length !== pathwayIds.length) {
          throw new AuthError('One or more pathways were not found', 404);
        }
      }

      await db.transaction(async (tx) => {
        await tx.delete(sectionPathways).where(eq(sectionPathways.sectionId, sectionId));
        if (pathwayIds.length > 0) {
          await tx.insert(sectionPathways).values(
            pathwayIds.map((pathwayId) => ({ sectionId, pathwayId })),
          );
        }
      });

      return this.listSectionPathways(teacherId, sectionId);
    },

    async archiveSection(teacherId: string, sectionId: string) {
      const section = await this.getSectionForTeacher(teacherId, sectionId);
      if (section.archivedAt) {
        return section;
      }
      const now = new Date();
      const [updated] = await db
        .update(sections)
        .set({ archivedAt: now, updatedAt: now })
        .where(eq(sections.id, sectionId))
        .returning();
      if (!updated) {
        throw new AuthError('Section not found', 404);
      }
      return updated;
    },

    async listRoster(teacherId: string, sectionId: string) {
      await this.getSectionForTeacher(teacherId, sectionId);
      const roster = await db.query.sectionStudents.findMany({
        where: and(eq(sectionStudents.sectionId, sectionId), isNull(sectionStudents.removedAt)),
      });
      return roster.map((row) => ({
        id: row.id,
        userId: row.userId,
        displayName: row.displayName,
        createdAt: row.createdAt,
      }));
    },

    /** Export roster metadata only — never include secret hashes. */
    async exportRoster(teacherId: string, sectionId: string) {
      const section = await this.getSectionForTeacher(teacherId, sectionId);
      const roster = await this.listRoster(teacherId, sectionId);
      return {
        section: {
          id: section.id,
          name: section.name,
          code: section.code,
          archivedAt: section.archivedAt ? section.archivedAt.toISOString() : null,
        },
        roster: roster.map((row) => ({
          displayName: row.displayName,
          membershipId: row.id,
          createdAt: row.createdAt.toISOString(),
        })),
      };
    },

    async addStudent(teacherId: string, sectionId: string, input: unknown) {
      const { displayName } = addSectionStudentSchema.parse(input);
      const section = await this.getSectionForTeacher(teacherId, sectionId);
      if (section.archivedAt) {
        throw new AuthError('Section is archived', 409);
      }

      const secretWords = generateSecretWords();
      const secretWordsHash = hashToken(normalizeSecretWords(secretWords));
      const normalizedName = displayName.trim();

      const created = await db.transaction(async (tx) => {
        // Serialize roster mutations for this section (class-size race).
        await tx.execute(sql`SELECT id FROM sections WHERE id = ${sectionId} FOR UPDATE`);

        const rosterCount = await tx.$count(
          sectionStudents,
          and(eq(sectionStudents.sectionId, sectionId), isNull(sectionStudents.removedAt)),
        );
        if (rosterCount >= MAX_SECTION_STUDENTS) {
          throw new AuthError(
            `Section is full (max ${MAX_SECTION_STUDENTS} students)`,
            409,
          );
        }

        const existing = await tx.query.sectionStudents.findFirst({
          where: and(
            eq(sectionStudents.sectionId, sectionId),
            eq(sectionStudents.displayName, normalizedName),
          ),
        });
        if (existing && !existing.removedAt) {
          throw new AuthError('Display name already used in this section', 409);
        }

        if (existing?.removedAt) {
          const [membership] = await tx
            .update(sectionStudents)
            .set({ secretWordsHash, removedAt: null })
            .where(eq(sectionStudents.id, existing.id))
            .returning();
          if (!membership) {
            throw new AuthError('Failed to re-add student', 500);
          }
          return { membership, studentUserId: existing.userId };
        }

        const [studentUser] = await tx.insert(users).values({ role: 'student' }).returning();
        if (!studentUser) {
          throw new AuthError('Failed to create student', 500);
        }

        await tx.insert(learnerProfiles).values({
          userId: studentUser.id,
          displayName: normalizedName,
          preferredLocale: 'en',
        });
        await tx.insert(consentRecords).values({
          userId: studentUser.id,
          consentType: 'classroom_participation_stub',
          granted: true,
        });

        const [membership] = await tx
          .insert(sectionStudents)
          .values({
            sectionId,
            userId: studentUser.id,
            displayName: normalizedName,
            secretWordsHash,
          })
          .returning();

        if (!membership) {
          throw new AuthError('Failed to add student', 500);
        }

        return { membership, studentUserId: studentUser.id };
      });

      return {
        id: created.membership.id,
        userId: created.studentUserId,
        displayName: created.membership.displayName,
        /** Shown once for teacher login cards — not stored in plaintext. */
        secretWords,
      };
    },

    /** Regenerate secret words; new words returned once, old hash invalidated. */
    async resetStudentSecretWords(teacherId: string, sectionId: string, membershipId: string) {
      await this.getSectionForTeacher(teacherId, sectionId);
      const membership = await db.query.sectionStudents.findFirst({
        where: and(
          eq(sectionStudents.id, membershipId),
          eq(sectionStudents.sectionId, sectionId),
          isNull(sectionStudents.removedAt),
        ),
      });
      if (!membership) {
        throw new AuthError('Student not found in section', 404);
      }
      let secretWords = generateSecretWords();
      let secretWordsHash = hashToken(normalizeSecretWords(secretWords));
      for (let attempt = 0; attempt < 8 && secretWordsHash === membership.secretWordsHash; attempt += 1) {
        secretWords = generateSecretWords();
        secretWordsHash = hashToken(normalizeSecretWords(secretWords));
      }
      await db
        .update(sectionStudents)
        .set({ secretWordsHash })
        .where(eq(sectionStudents.id, membershipId));
      return {
        id: membership.id,
        userId: membership.userId,
        displayName: membership.displayName,
        secretWords,
      };
    },

    /** Soft-remove membership — user account remains; re-add revives same user. */
    async removeStudent(teacherId: string, sectionId: string, membershipId: string) {
      await this.getSectionForTeacher(teacherId, sectionId);
      const membership = await db.query.sectionStudents.findFirst({
        where: and(
          eq(sectionStudents.id, membershipId),
          eq(sectionStudents.sectionId, sectionId),
          isNull(sectionStudents.removedAt),
        ),
      });
      if (!membership) {
        throw new AuthError('Student not found in section', 404);
      }
      const userId = membership.userId;
      await db
        .update(sectionStudents)
        .set({ removedAt: new Date() })
        .where(eq(sectionStudents.id, membershipId));
      const stillExists = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!stillExists) {
        throw new AuthError('User account missing after remove', 500);
      }
      return { ok: true as const, userId };
    },

    async lookupSectionByCode(input: unknown) {
      const { code } = sectionLookupSchema.parse(input);
      const section = await db.query.sections.findFirst({
        where: eq(sections.code, code),
      });
      if (!section || section.archivedAt) {
        throw new AuthError('Section not found', 404);
      }
      const roster = await db.query.sectionStudents.findMany({
        where: and(eq(sectionStudents.sectionId, section.id), isNull(sectionStudents.removedAt)),
      });
      return {
        code: section.code,
        name: section.name,
        students: roster.map((row) => ({ displayName: row.displayName })),
      };
    },

    async authenticateStudent(input: unknown) {
      const parsed = studentSignInSchema.parse(input);
      const section = await db.query.sections.findFirst({
        where: eq(sections.code, parsed.code),
      });
      if (!section || section.archivedAt) {
        throw new AuthError('Section not found', 404);
      }

      const membership = await db.query.sectionStudents.findFirst({
        where: and(
          eq(sectionStudents.sectionId, section.id),
          eq(sectionStudents.displayName, parsed.displayName.trim()),
          isNull(sectionStudents.removedAt),
        ),
      });
      if (!membership) {
        throw new AuthError('Student not found in section', 401);
      }

      const provided = hashToken(normalizeSecretWords(parsed.secretWords));
      if (provided !== membership.secretWordsHash) {
        throw new AuthError('Invalid secret words', 401);
      }

      return { userId: membership.userId, sectionId: section.id };
    },
  };
}

export type ClassroomService = ReturnType<typeof createClassroomService>;
