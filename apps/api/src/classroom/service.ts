import {
  addSectionStudentSchema,
  createSectionSchema,
  sectionLookupSchema,
  studentSignInSchema,
} from '@koode/contracts';
import {
  consentRecords,
  learnerProfiles,
  sectionStudents,
  sections,
  users,
  type Database,
} from '@koode/database';
import { and, eq } from 'drizzle-orm';
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
        where: eq(sectionStudents.sectionId, sectionId),
      });
      return roster.map((row) => ({
        id: row.id,
        userId: row.userId,
        displayName: row.displayName,
        createdAt: row.createdAt,
      }));
    },

    async addStudent(teacherId: string, sectionId: string, input: unknown) {
      const { displayName } = addSectionStudentSchema.parse(input);
      const section = await this.getSectionForTeacher(teacherId, sectionId);
      if (section.archivedAt) {
        throw new AuthError('Section is archived', 409);
      }

      const secretWords = generateSecretWords();
      const normalizedName = displayName.trim();

      const created = await db.transaction(async (tx) => {
        const rosterCount = await tx.$count(
          sectionStudents,
          eq(sectionStudents.sectionId, sectionId),
        );
        if (rosterCount >= MAX_SECTION_STUDENTS) {
          throw new AuthError(
            `Section is full (max ${MAX_SECTION_STUDENTS} students)`,
            409,
          );
        }

        const clash = await tx.query.sectionStudents.findFirst({
          where: and(
            eq(sectionStudents.sectionId, sectionId),
            eq(sectionStudents.displayName, normalizedName),
          ),
        });
        if (clash) {
          throw new AuthError('Display name already used in this section', 409);
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
            secretWordsHash: hashToken(normalizeSecretWords(secretWords)),
          })
          .returning();

        if (!membership) {
          throw new AuthError('Failed to add student', 500);
        }

        return { membership, studentUser };
      });

      return {
        id: created.membership.id,
        userId: created.studentUser.id,
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

    /** Drop section membership only — the user account remains. */
    async removeStudent(teacherId: string, sectionId: string, membershipId: string) {
      await this.getSectionForTeacher(teacherId, sectionId);
      const membership = await db.query.sectionStudents.findFirst({
        where: and(
          eq(sectionStudents.id, membershipId),
          eq(sectionStudents.sectionId, sectionId),
        ),
      });
      if (!membership) {
        throw new AuthError('Student not found in section', 404);
      }
      const userId = membership.userId;
      await db.delete(sectionStudents).where(eq(sectionStudents.id, membershipId));
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
        where: eq(sectionStudents.sectionId, section.id),
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
