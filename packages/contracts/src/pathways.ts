import { z } from 'zod';

export const pathwayStatusSchema = z.enum(['draft', 'published', 'archived']);

export const createPathwaySchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(2000).optional().default(''),
  locale: z.literal('en').optional().default('en'),
});

export const updatePathwaySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  summary: z.string().trim().max(2000).optional(),
  locale: z.literal('en').optional(),
  status: z.enum(['draft', 'published']).optional(),
});

export const pathwaySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  summary: z.string(),
  locale: z.string(),
  status: pathwayStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
});

export type CreatePathwayInput = z.infer<typeof createPathwaySchema>;
export type UpdatePathwayInput = z.infer<typeof updatePathwaySchema>;
export type Pathway = z.infer<typeof pathwaySchema>;
