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
      await this.getSectionForTeacher(teacherId, sectionId);

      const secretWords = generateSecretWords();
      const normalizedName = displayName.trim();

      const created = await db.transaction(async (tx) => {
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

    async lookupSectionByCode(input: unknown) {
      const { code } = sectionLookupSchema.parse(input);
      const section = await db.query.sections.findFirst({
        where: eq(sections.code, code),
      });
      if (!section) {
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
      if (!section) {
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
