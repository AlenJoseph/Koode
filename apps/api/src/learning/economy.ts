import {
  redeemShopItemSchema,
  type Certificate,
  type CoinLedgerEntry,
  type ShopItem,
} from '@koode/contracts';
import {
  certificates,
  coinLedger,
  shopRedemptions,
  type Database,
} from '@koode/database';
import { and, desc, eq, sql } from 'drizzle-orm';
import { AuthError } from '../auth/errors.js';

export const SHOP_CATALOG: ShopItem[] = [
  {
    id: 'badge-pause-pro',
    title: 'Pause pro badge',
    description: 'Cosmetic badge for your profile. Does not replace certificates.',
    costCoins: 20,
    kind: 'badge',
  },
  {
    id: 'sticker-breathe',
    title: 'Breathe sticker',
    description: 'A small sticker pack for your home screen.',
    costCoins: 10,
    kind: 'sticker',
  },
  {
    id: 'theme-calm',
    title: 'Calm theme',
    description: 'Softer accent colors in the learner shell.',
    costCoins: 35,
    kind: 'theme',
  },
];

function toLedgerEntry(row: typeof coinLedger.$inferSelect): CoinLedgerEntry {
  return {
    id: row.id,
    amount: row.amount,
    reason: row.reason,
    idempotencyKey: row.idempotencyKey,
    challengeId: row.challengeId,
    createdAt: row.createdAt.toISOString(),
  };
}

function toCertificate(row: typeof certificates.$inferSelect): Certificate {
  return {
    id: row.id,
    pathwayId: row.pathwayId,
    challengeId: row.challengeId,
    title: row.title,
    evidenceSummary: row.evidenceSummary,
    issuedAt: row.issuedAt.toISOString(),
  };
}

export function createEconomyService(database: Database) {
  const { db } = database;

  async function balance(userId: string): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${coinLedger.amount}), 0)` })
      .from(coinLedger)
      .where(eq(coinLedger.userId, userId));
    return Number(row?.total ?? 0);
  }

  return {
    async getBalance(userId: string): Promise<{ balance: number; ledger: CoinLedgerEntry[] }> {
      const ledgerRows = await db.query.coinLedger.findMany({
        where: eq(coinLedger.userId, userId),
        orderBy: [desc(coinLedger.createdAt)],
        limit: 50,
      });
      return {
        balance: await balance(userId),
        ledger: ledgerRows.map(toLedgerEntry),
      };
    },

    /**
     * Award coins once per challenge success (idempotent).
     * Never call from help/idle/progress heartbeats.
     */
    async awardChallengeSuccess(input: {
      userId: string;
      challengeId: string;
      amount: number;
      reason?: string;
    }): Promise<{ awarded: boolean; balance: number; entry: CoinLedgerEntry | null }> {
      if (input.amount <= 0) {
        return { awarded: false, balance: await balance(input.userId), entry: null };
      }
      const idempotencyKey = `challenge-success:${input.challengeId}:${input.userId}`;
      try {
        const [row] = await db
          .insert(coinLedger)
          .values({
            userId: input.userId,
            amount: input.amount,
            reason: input.reason ?? 'challenge_success',
            idempotencyKey,
            challengeId: input.challengeId,
          })
          .returning();
        return {
          awarded: true,
          balance: await balance(input.userId),
          entry: row ? toLedgerEntry(row) : null,
        };
      } catch (error) {
        if (isUniqueViolation(error)) {
          return { awarded: false, balance: await balance(input.userId), entry: null };
        }
        throw error;
      }
    },

    listShop(): { items: ShopItem[] } {
      return { items: SHOP_CATALOG };
    },

    async redeem(userId: string, body: unknown): Promise<{ ok: true; balance: number; itemId: string }> {
      const { itemId } = redeemShopItemSchema.parse(body);
      const item = SHOP_CATALOG.find((row) => row.id === itemId);
      if (!item) {
        throw new AuthError('Shop item not found', 404);
      }
      const existing = await db.query.shopRedemptions.findFirst({
        where: and(eq(shopRedemptions.userId, userId), eq(shopRedemptions.itemId, itemId)),
      });
      if (existing) {
        throw new AuthError('Already redeemed', 409);
      }
      const current = await balance(userId);
      if (current < item.costCoins) {
        throw new AuthError('Not enough Koode coins', 400);
      }
      const spendKey = `shop-redeem:${userId}:${itemId}`;
      await db.insert(coinLedger).values({
        userId,
        amount: -item.costCoins,
        reason: `shop:${itemId}`,
        idempotencyKey: spendKey,
        challengeId: null,
      });
      await db.insert(shopRedemptions).values({
        userId,
        itemId,
        costCoins: item.costCoins,
      });
      return { ok: true, balance: await balance(userId), itemId };
    },

    async listCertificates(userId: string): Promise<{ certificates: Certificate[] }> {
      const rows = await db.query.certificates.findMany({
        where: eq(certificates.userId, userId),
        orderBy: [desc(certificates.issuedAt)],
      });
      return { certificates: rows.map(toCertificate) };
    },

    async issueChallengeCertificate(input: {
      userId: string;
      challengeId: string;
      pathwayId: string | null;
      title: string;
      evidenceSummary: string;
    }): Promise<{ certificate: Certificate; created: boolean }> {
      const all = await db.query.certificates.findMany({
        where: eq(certificates.userId, input.userId),
      });
      const prior = all.find((c) => c.challengeId === input.challengeId);
      if (prior) {
        return { certificate: toCertificate(prior), created: false };
      }
      const [row] = await db
        .insert(certificates)
        .values({
          userId: input.userId,
          challengeId: input.challengeId,
          pathwayId: input.pathwayId,
          title: input.title,
          evidenceSummary: input.evidenceSummary,
        })
        .returning();
      return { certificate: toCertificate(row!), created: true };
    },

    async listRedemptions(userId: string): Promise<{ itemIds: string[] }> {
      const rows = await db.query.shopRedemptions.findMany({
        where: eq(shopRedemptions.userId, userId),
      });
      return { itemIds: rows.map((r) => r.itemId) };
    },
  };
}

export type EconomyService = ReturnType<typeof createEconomyService>;

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const record = error as { code?: unknown; cause?: unknown; message?: unknown };
  if (record.code === '23505') {
    return true;
  }
  if (record.cause && isUniqueViolation(record.cause)) {
    return true;
  }
  if (typeof record.message === 'string' && /duplicate key|unique constraint/i.test(record.message)) {
    return true;
  }
  return false;
}
