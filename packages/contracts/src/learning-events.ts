import { z } from 'zod';

/**
 * Itza-inspired learning event catalog (Phase A: Postgres ingest).
 * Envelope stays Kafka-ready: eventId idempotency, learnerId partition key, eventType discriminator.
 */

export const learningEventTypeSchema = z.enum([
  // Pathway / session
  'PATHWAY_ENROLLED',
  'PATHWAY_STARTED',
  'PATHWAY_COMPLETED',
  'SESSION_STARTED',
  'SESSION_ENDED',
  // Video
  'VIDEO_STARTED',
  'VIDEO_PROGRESS',
  'VIDEO_PAUSED',
  'VIDEO_RESUMED',
  'VIDEO_SEEKED',
  'VIDEO_COMPLETED',
  'VIDEO_REWATCHED',
  // Slide / reading
  'SLIDE_OPENED',
  'SLIDE_PROGRESS',
  'SLIDE_COMPLETED',
  // Quiz / practice
  'QUIZ_STARTED',
  'QUIZ_ANSWERED',
  'QUIZ_HINT_REQUESTED',
  'QUIZ_COMPLETED',
  'QUIZ_RETRY',
  // Challenge / step
  'CHALLENGE_STARTED',
  'CHALLENGE_COMPLETED',
  'STEP_ENTERED',
  'STEP_IDLE',
  'STEP_COMPLETED',
  'STEP_ABANDONED',
  // Struggle / help
  'CONCEPT_FLAGGED_CONFUSING',
  'COPILOT_QUESTION_ASKED',
  'COPILOT_FEEDBACK',
  'AUTO_HELP_NUDGE_SHOWN',
  'AUTO_HELP_NUDGE_DISMISSED',
]);

export const learningEventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  eventType: learningEventTypeSchema,
  /** Server overwrites from session; clients may omit or send their own id (ignored). */
  learnerId: z.string().uuid().optional(),
  pathwayId: z.string().max(120).nullable().optional(),
  contentId: z.string().max(120).nullable().optional(),
  stepId: z.string().max(120).nullable().optional(),
  occurredAt: z.string().datetime({ offset: true }),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const learningEventsIngestSchema = z.object({
  events: z.array(learningEventEnvelopeSchema).min(1).max(50),
});

export const autoHelpNudgeSchema = z.object({
  reason: z.enum([
    'fail_streak',
    'hint_then_fail',
    'seek_thrash',
    'step_idle',
    'flagged',
  ]),
  pathwayId: z.string().nullable(),
  contentId: z.string().nullable(),
  stepId: z.string().nullable(),
  message: z.string().min(1).max(300),
});

export const learningEventsIngestResponseSchema = z.object({
  accepted: z.number().int().min(0),
  duplicates: z.number().int().min(0),
  nudge: autoHelpNudgeSchema.nullable(),
});

export type LearningEventType = z.infer<typeof learningEventTypeSchema>;
export type LearningEventEnvelope = z.infer<typeof learningEventEnvelopeSchema>;
export type AutoHelpNudge = z.infer<typeof autoHelpNudgeSchema>;
export type LearningEventsIngestResponse = z.infer<typeof learningEventsIngestResponseSchema>;
