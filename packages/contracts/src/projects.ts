import { z } from 'zod';

export const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(2000).optional().default(''),
  pathwayId: z.string().uuid().nullable().optional(),
  challengeId: z.string().uuid().nullable().optional(),
});

export const updateProjectSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  summary: z.string().trim().max(2000).optional(),
  pathwayId: z.string().uuid().nullable().optional(),
  challengeId: z.string().uuid().nullable().optional(),
});

export const projectSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  summary: z.string(),
  pathwayId: z.string().uuid().nullable(),
  challengeId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type Project = z.infer<typeof projectSchema>;
