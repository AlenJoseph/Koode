import { z } from 'zod';
import { localeSchema } from './i18n/locales.js';

export const emailSchema = z.string().trim().email().max(320);

/** teacher = classroom; student = roster/classroom login; learner = independent email account */
export const userRoleSchema = z.enum(['teacher', 'student', 'learner']);

export const magicLinkIntentSchema = z.enum(['teacher', 'learner']);

export const magicLinkRequestSchema = z.object({
  email: emailSchema,
  intent: magicLinkIntentSchema.default('teacher'),
});

export const magicLinkVerifySchema = z.object({
  token: z.string().min(20).max(200),
});

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema.nullable(),
  role: userRoleSchema,
  preferredLocale: localeSchema,
  displayName: z.string().nullable(),
  sectionId: z.string().uuid().nullable(),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type MagicLinkIntent = z.infer<typeof magicLinkIntentSchema>;
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
export type MagicLinkVerify = z.infer<typeof magicLinkVerifySchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
