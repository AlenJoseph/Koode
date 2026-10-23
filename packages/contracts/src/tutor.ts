import { z } from 'zod';
import { paceBandSchema } from './content.js';
import { localeSchema } from './i18n/locales.js';

export const tutorPhaseSchema = z.enum([
  'explain',
  'guiding_question',
  'check_understanding',
]);

export const tutorTurnRequestSchema = z.object({
  locale: localeSchema.default('en'),
  topic: z.string().trim().min(1).max(200),
  learnerMessage: z.string().trim().min(1).max(4000),
  phase: tutorPhaseSchema.default('explain'),
  pathwayId: z.string().uuid().nullable().optional(),
  challengeId: z.string().uuid().nullable().optional(),
  /** Content manual challenge id (kebab-case), e.g. pause-before-react. */
  contentChallengeId: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .nullable()
    .optional(),
  /** Content manual pathway id (kebab-case). Required with contentChallengeId for load. */
  contentPathwayId: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .nullable()
    .optional(),
  paceBand: paceBandSchema.optional(),
  localContext: z.string().trim().max(500).optional(),
  interests: z.string().trim().max(500).optional(),
  /** Compact recent learning facts for Copilot context (from learning_events). */
  recentLearningFacts: z.string().trim().max(4000).optional(),
  stepId: z.string().regex(/^[a-z0-9_-]+$/).nullable().optional(),
});

export const tutorTurnResponseSchema = z.object({
  phase: tutorPhaseSchema,
  reply: z.string().trim().min(1).max(8000),
  guidingQuestion: z.string().trim().min(1).max(1000).nullable(),
  uncertaintyNote: z.string().trim().max(1000).nullable(),
  nextPhase: tutorPhaseSchema,
});

export type TutorPhase = z.infer<typeof tutorPhaseSchema>;
export type TutorTurnRequest = z.infer<typeof tutorTurnRequestSchema>;
export type TutorTurnResponse = z.infer<typeof tutorTurnResponseSchema>;
