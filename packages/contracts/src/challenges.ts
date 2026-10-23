import { z } from 'zod';

export const challengeStatusSchema = z.enum(['draft', 'published', 'archived']);

export const createChallengeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(2000).optional().default(''),
  locale: z.literal('en').optional().default('en'),
  pathwayId: z.string().uuid().nullable().optional(),
});

export const updateChallengeSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  summary: z.string().trim().max(2000).optional(),
  locale: z.literal('en').optional(),
  status: z.enum(['draft', 'published']).optional(),
  pathwayId: z.string().uuid().nullable().optional(),
});

export const challengeSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().nullable().optional(),
  title: z.string(),
  summary: z.string(),
  locale: z.string(),
  status: challengeStatusSchema,
  pathwayId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
export type Challenge = z.infer<typeof challengeSchema>;
