import { z } from 'zod';

export const coinLedgerEntrySchema = z.object({
  id: z.string().uuid(),
  amount: z.number().int(),
  reason: z.string().min(1).max(120),
  idempotencyKey: z.string().min(1).max(200),
  challengeId: z.string().uuid().nullable(),
  createdAt: z.string().datetime({ offset: true }),
});

export const shopItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  costCoins: z.number().int().positive(),
  kind: z.enum(['badge', 'theme', 'sticker']),
});

export const redeemShopItemSchema = z.object({
  itemId: z.string().regex(/^[a-z0-9_-]+$/),
});

export const certificateSchema = z.object({
  id: z.string().uuid(),
  pathwayId: z.string().uuid().nullable(),
  challengeId: z.string().uuid().nullable(),
  title: z.string().min(1).max(200),
  evidenceSummary: z.string().min(1).max(2000),
  issuedAt: z.string().datetime({ offset: true }),
});

export type CoinLedgerEntry = z.infer<typeof coinLedgerEntrySchema>;
export type ShopItem = z.infer<typeof shopItemSchema>;
export type Certificate = z.infer<typeof certificateSchema>;
