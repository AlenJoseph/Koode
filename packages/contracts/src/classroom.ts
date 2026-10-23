import { z } from 'zod';

export const sectionCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z2-9]{6}$/, 'Section code must be 6 characters');

export const createSectionSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const addSectionStudentSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
});

export const sectionLookupSchema = z.object({
  code: sectionCodeSchema,
});

export const studentSignInSchema = z.object({
  code: sectionCodeSchema,
  displayName: z.string().trim().min(1).max(80),
  secretWords: z.string().trim().min(3).max(80),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type AddSectionStudentInput = z.infer<typeof addSectionStudentSchema>;
export type StudentSignInInput = z.infer<typeof studentSignInSchema>;
