import { z } from 'zod';
import { localeSchema } from './i18n/locales.js';

export const emailSchema = z.string().trim().email().max(320);

/** teacher = classroom; student = roster; learner = independent; admin = platform */
export const userRoleSchema = z.enum(['teacher', 'student', 'learner', 'admin']);

export const magicLinkIntentSchema = z.enum(['teacher', 'learner', 'claim', 'admin']);

export const magicLinkRequestSchema = z
  .object({
    email: emailSchema,
    intent: magicLinkIntentSchema.default('teacher'),
    /** Required when intent is learner (independent sign-up age gate). */
    ageConfirmed: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.intent === 'learner' && data.ageConfirmed !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Age confirmation required for learner sign-up (13+)',
        path: ['ageConfirmed'],
      });
    }
  });

export const magicLinkVerifySchema = z.object({
  token: z.string().min(20).max(200),
});

/** Authenticated classroom (or any) user claiming an email onto their account */
export const claimEmailRequestSchema = z.object({
  email: emailSchema,
});

export const adminBootstrapSchema = z.object({
  email: emailSchema,
  bootstrapSecret: z.string().min(16).max(200),
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
export type ClaimEmailRequest = z.infer<typeof claimEmailRequestSchema>;
export type AdminBootstrapRequest = z.infer<typeof adminBootstrapSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;

