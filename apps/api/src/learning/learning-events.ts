import {
  learningEventsIngestSchema,
  type AutoHelpNudge,
  type LearningEventEnvelope,
  type LearningEventsIngestResponse,
} from '@koode/contracts';
import { autoHelpState, learningEvents, type Database } from '@koode/database';
import { and, desc, eq, gte } from 'drizzle-orm';
import {
  DEFAULT_AUTO_HELP_CONFIG,
  evaluateAutoHelp,
  nextFailCount,
  scopeKey,
  type AutoHelpConfig,
  type ScopeState,
} from './auto-help-rules.js';

function rowToEnvelope(row: typeof learningEvents.$inferSelect): LearningEventEnvelope {
  return {
    eventId: row.eventId,
    eventType: row.eventType as LearningEventEnvelope['eventType'],
    learnerId: row.learnerId,
    pathwayId: row.pathwayId,
    contentId: row.contentId,
    stepId: row.stepId,
    occurredAt: row.occurredAt.toISOString(),
    payload: (row.payload ?? {}) as Record<string, unknown>,
  };
}

export function createLearningEventsService(
  database: Database,
  config: AutoHelpConfig = DEFAULT_AUTO_HELP_CONFIG,
) {
  const { db } = database;

  async function loadScopeState(
    learnerId: string,
    key: string,
  ): Promise<{ row: typeof autoHelpState.$inferSelect | null; state: ScopeState }> {
    const row =
      (await db.query.autoHelpState.findFirst({
        where: and(eq(autoHelpState.learnerId, learnerId), eq(autoHelpState.scopeKey, key)),
      })) ?? null;
    return {
      row,
      state: {
        failCount: row?.failCount ?? 0,
        hadHint: false,
        lastNudgeAt: row?.lastNudgeAt ?? null,
        suppressedUntil: row?.suppressedUntil ?? null,
      },
    };
  }

  async function persistNudgeState(input: {
    learnerId: string;
    key: string;
    pathwayId: string | null;
    contentId: string | null;
    stepId: string | null;
    failCount: number;
    nudge: AutoHelpNudge | null;
    now: Date;
  }): Promise<void> {
    const { learnerId, key, pathwayId, contentId, stepId, failCount, nudge, now } = input;
    const existing = await db.query.autoHelpState.findFirst({
      where: and(eq(autoHelpState.learnerId, learnerId), eq(autoHelpState.scopeKey, key)),
    });
    const values = {
      learnerId,
      scopeKey: key,
      pathwayId,
      contentId,
      stepId,
      failCount,
      updatedAt: now,
      ...(nudge
        ? {
            lastNudgeReason: nudge.reason,
            lastNudgeAt: now,
            suppressedUntil: new Date(now.getTime() + config.suppressMs),
          }
        : {}),
    };
    if (existing) {
      await db
        .update(autoHelpState)
        .set(values)
        .where(eq(autoHelpState.id, existing.id));
    } else {
      await db.insert(autoHelpState).values(values);
    }
  }

  return {
    async ingest(learnerId: string, body: unknown): Promise<LearningEventsIngestResponse> {
      const data = learningEventsIngestSchema.parse(body);
      const now = new Date();
      let accepted = 0;
      let duplicates = 0;
      const acceptedEvents: LearningEventEnvelope[] = [];

      for (const raw of data.events) {
        const envelope: LearningEventEnvelope = {
          ...raw,
          learnerId,
          payload: raw.payload ?? {},
        };
        try {
          await db.insert(learningEvents).values({
            eventId: envelope.eventId,
            eventType: envelope.eventType,
            learnerId,
            pathwayId: envelope.pathwayId ?? null,
            contentId: envelope.contentId ?? null,
            stepId: envelope.stepId ?? null,
            occurredAt: new Date(envelope.occurredAt),
            payload: envelope.payload,
          });
          accepted += 1;
          acceptedEvents.push(envelope);
        } catch (error) {
          if (isUniqueViolation(error)) {
            duplicates += 1;
            continue;
          }
          throw error;
        }
      }

      let nudge: AutoHelpNudge | null = null;
      if (acceptedEvents.length > 0) {
        const focus = acceptedEvents[acceptedEvents.length - 1]!;
        const key = scopeKey(focus);
        const { state } = await loadScopeState(learnerId, key);
        const since = new Date(now.getTime() - config.seekWindowMs);
        const recentRows = await db.query.learningEvents.findMany({
          where: and(
            eq(learningEvents.learnerId, learnerId),
            gte(learningEvents.occurredAt, since),
          ),
          orderBy: [desc(learningEvents.occurredAt)],
          limit: 100,
        });
        const recentForScope = recentRows
          .map(rowToEnvelope)
          .filter((e) => scopeKey(e) === key)
          .reverse();

        // Detect prior hints in recent history for this scope
        const hadHint =
          recentForScope.some((e) => e.eventType === 'QUIZ_HINT_REQUESTED') ||
          acceptedEvents.some((e) => e.eventType === 'QUIZ_HINT_REQUESTED');

        nudge = evaluateAutoHelp({
          config,
          now,
          incoming: acceptedEvents.filter((e) => scopeKey(e) === key),
          recentForScope,
          state: { ...state, hadHint },
        });

        const failCount = nextFailCount(state, acceptedEvents.filter((e) => scopeKey(e) === key));
        await persistNudgeState({
          learnerId,
          key,
          pathwayId: focus.pathwayId ?? null,
          contentId: focus.contentId ?? null,
          stepId: focus.stepId ?? null,
          failCount,
          nudge,
          now,
        });
      }

      return { accepted, duplicates, nudge };
    },

    async listRecent(
      learnerId: string,
      options?: { pathwayId?: string; contentId?: string; stepId?: string; limit?: number },
    ): Promise<LearningEventEnvelope[]> {
      const limit = Math.min(options?.limit ?? 40, 100);
      const rows = await db.query.learningEvents.findMany({
        where: eq(learningEvents.learnerId, learnerId),
        orderBy: [desc(learningEvents.occurredAt)],
        limit: 200,
      });
      return rows
        .map(rowToEnvelope)
        .filter((e) => {
          if (options?.pathwayId && e.pathwayId !== options.pathwayId) return false;
          if (options?.contentId && e.contentId !== options.contentId) return false;
          if (options?.stepId && e.stepId !== options.stepId) return false;
          return true;
        })
        .slice(0, limit);
    },

    async getAutoHelp(
      learnerId: string,
      query: { contentId?: string; stepId?: string },
    ): Promise<{ nudge: AutoHelpNudge | null }> {
      const key = scopeKey({
        contentId: query.contentId ?? null,
        stepId: query.stepId ?? null,
      });
      const { row, state } = await loadScopeState(learnerId, key);
      if (!row?.lastNudgeReason || !row.lastNudgeAt) {
        return { nudge: null };
      }
      if (state.suppressedUntil && state.suppressedUntil.getTime() < Date.now()) {
        // still expose last nudge briefly if within suppress window from lastNudgeAt
      }
      const age = Date.now() - row.lastNudgeAt.getTime();
      if (age > config.suppressMs) {
        return { nudge: null };
      }
      return {
        nudge: {
          reason: row.lastNudgeReason as AutoHelpNudge['reason'],
          pathwayId: row.pathwayId,
          contentId: row.contentId,
          stepId: row.stepId,
          message:
            row.lastNudgeReason === 'flagged'
              ? 'You flagged this as confusing — Copilot can walk it with you.'
              : 'Stuck? Open Need help? for a guiding question — not the answer.',
        },
      };
    },
  };
}

export type LearningEventsService = ReturnType<typeof createLearningEventsService>;

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
