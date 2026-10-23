import { z } from 'zod';

/** How fast this learner should move through a challenge. LLM uses this, never a permanent label. */
export const paceBandSchema = z.enum(['supported', 'steady', 'fast']);

export const challengeKindSchema = z.enum([
  'quiz',
  'scenario',
  'reflection',
  'field_task',
  'mini_project',
  'lesson',
]);

/** Ordered multi-modal lesson steps (Phase A player). */
export const lessonStepKindSchema = z.enum([
  'slide',
  'video',
  'practice',
  'quiz',
  'reflection',
  'field',
]);

export const lessonStepSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/),
  kind: lessonStepKindSchema,
  title: z.string().trim().min(1).max(200),
  /** Markdown body for slide / reflection / field / practice intro. */
  bodyMarkdown: z.string().trim().max(8000).optional(),
  /** Public URL or path for video steps. */
  mediaUrl: z.string().trim().max(2000).optional(),
  /** Approximate media length for progress UI. */
  mediaDurationSeconds: z.number().int().positive().max(3600).optional(),
  /** Quiz item ids from challenge.quiz for quiz/practice steps. */
  quizItemIds: z.array(z.string().regex(/^[a-z0-9_-]+$/)).max(12).optional(),
  conceptId: z.string().regex(/^[a-z0-9_-]+$/).optional(),
});

export const quizOptionSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/),
  label: z.string().trim().min(1).max(400),
});

export const quizItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/),
  prompt: z.string().trim().min(1).max(2000),
  options: z.array(quizOptionSchema).min(2).max(6),
  /** Prefer teaching over gotchas. LLM may rephrase but must keep the same correct id. */
  correctOptionId: z.string().regex(/^[a-z0-9_-]+$/),
  teachBack: z.string().trim().min(1).max(1000),
});

export const llmPersonalizationSchema = z.object({
  /** Main product claim: adapt examples, reading level, and step size per child — never replace their thinking. */
  adaptAxes: z
    .array(z.enum(['pace', 'reading_level', 'local_context', 'interests', 'language_mix']))
    .min(1),
  paceBands: z.object({
    supported: z.object({
      hintDensity: z.enum(['high', 'medium', 'low']),
      stepSize: z.enum(['small', 'normal', 'stretch']),
      coachNote: z.string().trim().min(1).max(500),
    }),
    steady: z.object({
      hintDensity: z.enum(['high', 'medium', 'low']),
      stepSize: z.enum(['small', 'normal', 'stretch']),
      coachNote: z.string().trim().min(1).max(500),
    }),
    fast: z.object({
      hintDensity: z.enum(['high', 'medium', 'low']),
      stepSize: z.enum(['small', 'normal', 'stretch']),
      coachNote: z.string().trim().min(1).max(500),
    }),
  }),
  tutorBrief: z.string().trim().min(1).max(2000),
  /** Template for runtime LLM personalization. Placeholders documented in content/README.md */
  personalizeTemplate: z.string().trim().min(1).max(4000),
});

export const contentChallengeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  kind: challengeKindSchema,
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(1000),
  locale: z.literal('en'),
  estimatedMinutes: z.number().int().min(5).max(90),
  objectives: z.array(z.string().trim().min(1).max(300)).min(1).max(6),
  /** Learner-facing body. Markdown allowed inside the string. */
  briefMarkdown: z.string().trim().min(1).max(8000),
  quiz: z.array(quizItemSchema).max(12).optional(),
  /** When present, learner UI uses the step player instead of brief-only quiz. */
  steps: z.array(lessonStepSchema).min(1).max(24).optional(),
  /** Koode coins awarded once on successCriteria evidence (idempotent key per challenge). */
  coinReward: z.number().int().min(0).max(500).optional(),
  reflectionPrompt: z.string().trim().max(2000).optional(),
  fieldPrompt: z.string().trim().max(2000).optional(),
  projectPrompt: z.string().trim().max(2000).optional(),
  successCriteria: z.array(z.string().trim().min(1).max(300)).min(1).max(8),
  llm: llmPersonalizationSchema,
});

export const contentPathwaySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(1).max(120),
  promise: z.string().trim().min(1).max(300),
  locale: z.literal('en'),
  status: z.enum(['draft', 'published']),
  skills: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
  /** Order of challenge ids in this folder. */
  challengeOrder: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1),
  introMarkdown: z.string().trim().min(1).max(6000),
  llm: llmPersonalizationSchema,
});

export const contentCatalogSchema = z.object({
  version: z.literal(1),
  pathways: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1),
});

export type PaceBand = z.infer<typeof paceBandSchema>;
export type LessonStep = z.infer<typeof lessonStepSchema>;
export type LessonStepKind = z.infer<typeof lessonStepKindSchema>;
export type ContentChallenge = z.infer<typeof contentChallengeSchema>;
export type ContentPathway = z.infer<typeof contentPathwaySchema>;
export type ContentCatalog = z.infer<typeof contentCatalogSchema>;
