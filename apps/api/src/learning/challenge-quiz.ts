import {
  contentChallengeSchema,
  type ContentChallenge,
} from '@koode/contracts';
import { challengeAttempts, challenges, pathways, type Database } from '@koode/database';
import type { ContentLoader } from '@koode/agent-runtime';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { AuthError } from '../auth/errors.js';

const submitQuizSchema = z.object({
  answers: z
    .array(
      z.object({
        quizItemId: z.string().regex(/^[a-z0-9_-]+$/),
        optionId: z.string().regex(/^[a-z0-9_-]+$/),
      }),
    )
    .min(1)
    .max(12),
  /** Lesson step id when submitted from the step player. */
  stepId: z.string().regex(/^[a-z0-9_-]+$/).nullable().optional(),
});

export type LearnerQuizView = {
  challengeId: string;
  slug: string;
  pathwaySlug: string;
  title: string;
  summary: string;
  briefMarkdown: string;
  objectives: string[];
  reflectionPrompt: string | null;
  quiz: Array<{
    id: string;
    prompt: string;
    options: Array<{ id: string; label: string }>;
  }>;
};

export type QuizSubmitResult = {
  attempt: {
    id: string;
    challengeId: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
  };
  score: { correct: number; total: number };
  /** True when every item is correct — attempt is completed only then. */
  passed: boolean;
  pathwaySlug: string;
  contentSlug: string;
  stepId: string | null;
  items: Array<{
    quizItemId: string;
    selectedOptionId: string;
    /** Omitted unless passed — reduces answer-key leakage on failed attempts. */
    correctOptionId?: string;
    isCorrect: boolean;
    teachBack: string;
  }>;
};

export function createChallengeQuizService(
  database: Database,
  contentLoader: ContentLoader | null,
) {
  const { db } = database;

  async function loadManual(challengeId: string): Promise<{
    challenge: typeof challenges.$inferSelect;
    pathwaySlug: string;
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
    return { challenge, pathwaySlug: pathway.slug, manual };
  }

  return {
    async getLearnerQuiz(challengeId: string): Promise<LearnerQuizView> {
      const { challenge, pathwaySlug, manual } = await loadManual(challengeId);
      return {
        challengeId: challenge.id,
        slug: challenge.slug!,
        pathwaySlug,
        title: manual.title,
        summary: manual.summary,
        briefMarkdown: manual.briefMarkdown,
        objectives: manual.objectives,
        reflectionPrompt: manual.reflectionPrompt ?? null,
        quiz: (manual.quiz ?? []).map((item) => ({
          id: item.id,
          prompt: item.prompt,
          options: item.options.map((opt) => ({ id: opt.id, label: opt.label })),
        })),
      };
    },

    async submitQuiz(
      userId: string,
      attemptId: string,
      body: unknown,
    ): Promise<QuizSubmitResult> {
      const data = submitQuizSchema.parse(body);
      const attempt = await db.query.challengeAttempts.findFirst({
        where: and(eq(challengeAttempts.id, attemptId), eq(challengeAttempts.userId, userId)),
      });
      if (!attempt) {
        throw new AuthError('Attempt not found', 404);
      }
      if (attempt.status === 'completed') {
        throw new AuthError('Attempt already completed', 409);
      }

      const { challenge, pathwaySlug, manual } = await loadManual(attempt.challengeId);
      const quiz = manual.quiz ?? [];
      if (quiz.length === 0) {
        throw new AuthError('Challenge has no quiz', 400);
      }

      const answerMap = new Map(data.answers.map((a) => [a.quizItemId, a.optionId]));
      if (answerMap.size !== data.answers.length) {
        throw new AuthError('Duplicate quiz answers', 400);
      }
      for (const item of quiz) {
        if (!answerMap.has(item.id)) {
          throw new AuthError(`Missing answer for ${item.id}`, 400);
        }
        const selected = answerMap.get(item.id)!;
        if (!item.options.some((opt) => opt.id === selected)) {
          throw new AuthError(`Invalid option for ${item.id}`, 400);
        }
      }

      const graded = quiz.map((item) => {
        const selectedOptionId = answerMap.get(item.id)!;
        const isCorrect = selectedOptionId === item.correctOptionId;
        return {
          quizItemId: item.id,
          selectedOptionId,
          correctOptionId: item.correctOptionId,
          isCorrect,
          teachBack: item.teachBack,
        };
      });
      const correct = graded.filter((row) => row.isCorrect).length;
      const passed = correct === graded.length && graded.length > 0;
      const now = new Date();

      let row = attempt;
      if (passed) {
        const [updated] = await db
          .update(challengeAttempts)
          .set({ status: 'completed', completedAt: now, updatedAt: now })
          .where(eq(challengeAttempts.id, attempt.id))
          .returning();
        if (!updated) {
          throw new AuthError('Attempt not found', 404);
        }
        row = updated;
      } else {
        await db
          .update(challengeAttempts)
          .set({ updatedAt: now })
          .where(eq(challengeAttempts.id, attempt.id));
      }

      return {
        attempt: {
          id: row.id,
          challengeId: row.challengeId,
          status: row.status,
          startedAt: row.startedAt.toISOString(),
          completedAt: row.completedAt ? row.completedAt.toISOString() : null,
        },
        score: { correct, total: graded.length },
        passed,
        pathwaySlug,
        contentSlug: challenge.slug!,
        stepId: data.stepId ?? null,
        items: graded.map((item) => ({
          quizItemId: item.quizItemId,
          selectedOptionId: item.selectedOptionId,
          isCorrect: item.isCorrect,
          teachBack: item.teachBack,
          ...(passed ? { correctOptionId: item.correctOptionId } : {}),
        })),
      };
    },
  };
}

export type ChallengeQuizService = ReturnType<typeof createChallengeQuizService>;
