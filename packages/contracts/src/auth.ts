import { z } from 'zod';
import { localeSchema } from './i18n/locales.js';

export const emailSchema = z.string().trim().email().max(320);

export const magicLinkRequestSchema = z.object({
  email: emailSchema,
});

export const magicLinkVerifySchema = z.object({
  token: z.string().min(20).max(200),
});

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema,
  preferredLocale: localeSchema,
  displayName: z.string().nullable(),
});

export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
export type MagicLinkVerify = z.infer<typeof magicLinkVerifySchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
