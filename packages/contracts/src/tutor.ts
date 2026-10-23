import { z } from 'zod';
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
