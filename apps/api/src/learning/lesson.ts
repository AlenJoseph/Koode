import {
  contentChallengeSchema,
  type ContentChallenge,
  type LessonStep,
} from '@koode/contracts';
import {
  challenges,
  lessonProgress,
  pathways,
  type Database,
} from '@koode/database';
import type { ContentLoader } from '@koode/agent-runtime';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { AuthError } from '../auth/errors.js';

const saveProgressSchema = z.object({
  currentStepId: z.string().regex(/^[a-z0-9_-]+$/),
  completedStepIds: z.array(z.string().regex(/^[a-z0-9_-]+$/)).max(24),
});

export type LearnerLessonView = {
  challengeId: string;
  slug: string;
  pathwaySlug: string;
  title: string;
  summary: string;
  objectives: string[];
  successCriteria: string[];
  coinReward: number;
  steps: LessonStep[];
  quiz: ContentChallenge['quiz'];
  progress: {
    currentStepId: string;
    completedStepIds: string[];
  } | null;
};

export function createLessonService(database: Database, contentLoader: ContentLoader | null) {
  const { db } = database;

  async function loadManual(challengeId: string): Promise<{
    challenge: typeof challenges.$inferSelect;
    pathwaySlug: string;
    pathwayId: string | null;
    manual: ContentChallenge;
  }> {
    if (!contentLoader) {
      throw new AuthError('Content manuals are not available on this server', 503);
    }
    const challenge = await db.query.challenges.findFirst({
      where: eq(challenges.id, challengeId),
    });
    if (!challenge || challenge.status !== 'published') {
      throw new AuthError('Challenge not found', 404);
    }
    if (!challenge.slug || !challenge.pathwayId) {
      throw new AuthError('Challenge has no content manual', 404);
    }
    const pathway = await db.query.pathways.findFirst({
      where: eq(pathways.id, challenge.pathwayId),
    });
    if (!pathway?.slug) {
      throw new AuthError('Pathway has no content manual', 404);
    }
    const manual = contentChallengeSchema.parse(
      contentLoader.loadChallenge(pathway.slug, challenge.slug),
    );
    return {
      challenge,
      pathwaySlug: pathway.slug,
      pathwayId: pathway.id,
      manual,
    };
  }

  return {
    async getLesson(userId: string, challengeId: string): Promise<LearnerLessonView> {
      const { challenge, pathwaySlug, manual } = await loadManual(challengeId);
      if (!manual.steps?.length) {
        throw new AuthError('Challenge has no lesson steps', 404);
      }
      const progress = await db.query.lessonProgress.findFirst({
        where: and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.challengeId, challengeId),
        ),
      });
      let completedStepIds: string[] = [];
      if (progress?.completedStepIds) {
        try {
          completedStepIds = JSON.parse(progress.completedStepIds) as string[];
        } catch {
          completedStepIds = [];
        }
      }
      return {
        challengeId: challenge.id,
        slug: challenge.slug!,
        pathwaySlug,
        title: manual.title,
        summary: manual.summary,
        objectives: manual.objectives,
        successCriteria: manual.successCriteria,
        coinReward: manual.coinReward ?? 0,
        steps: manual.steps!,
        quiz: manual.quiz,
        progress: progress
          ? { currentStepId: progress.currentStepId, completedStepIds }
          : null,
      };
    },

    async saveProgress(userId: string, challengeId: string, body: unknown) {
      const data = saveProgressSchema.parse(body);
      const { manual } = await loadManual(challengeId);
      if (!manual.steps?.length) {
        throw new AuthError('Challenge has no lesson steps', 404);
      }
      const stepIds = new Set(manual.steps.map((s) => s.id));
      if (!stepIds.has(data.currentStepId)) {
        throw new AuthError('Unknown step', 400);
      }
      for (const id of data.completedStepIds) {
        if (!stepIds.has(id)) {
          throw new AuthError('Unknown completed step', 400);
        }
      }
      const existing = await db.query.lessonProgress.findFirst({
        where: and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.challengeId, challengeId),
        ),
      });
      const completedJson = JSON.stringify(data.completedStepIds);
      if (existing) {
        const [row] = await db
          .update(lessonProgress)
          .set({
            currentStepId: data.currentStepId,
            completedStepIds: completedJson,
            updatedAt: new Date(),
          })
          .where(eq(lessonProgress.id, existing.id))
          .returning();
        return {
          currentStepId: row!.currentStepId,
          completedStepIds: data.completedStepIds,
        };
      }
      const [row] = await db
        .insert(lessonProgress)
        .values({
          userId,
          challengeId,
          currentStepId: data.currentStepId,
          completedStepIds: completedJson,
        })
        .returning();
      return {
        currentStepId: row!.currentStepId,
        completedStepIds: data.completedStepIds,
      };
    },

    async loadManualForEconomy(challengeId: string) {
      return loadManual(challengeId);
    },
  };
}

export type LessonService = ReturnType<typeof createLessonService>;
