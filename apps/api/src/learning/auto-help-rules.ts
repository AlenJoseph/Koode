import type { AutoHelpNudge, LearningEventEnvelope } from '@koode/contracts';

export type AutoHelpConfig = {
  enabled: boolean;
  failStreakThreshold: number;
  seekThrashThreshold: number;
  seekWindowMs: number;
  suppressMs: number;
  /** Client idle timer; exposed via GET /learning/config. */
  idleMs: number;
};

export const DEFAULT_AUTO_HELP_CONFIG: AutoHelpConfig = {
  enabled: true,
  failStreakThreshold: 2,
  seekThrashThreshold: 4,
  seekWindowMs: 60_000,
  suppressMs: 10 * 60_000,
  idleMs: 15_000,
};

/** Only server-graded QUIZ_ANSWERED (graded:true) count toward fail streaks. */
export function isTrustedQuizGrade(payload: Record<string, unknown>): boolean {
  return payload.graded === true && typeof payload.correct === 'boolean';
}

export type ScopeState = {
  failCount: number;
  hadHint: boolean;
  lastNudgeAt: Date | null;
  suppressedUntil: Date | null;
};

function scopeKey(event: Pick<LearningEventEnvelope, 'contentId' | 'stepId'>): string {
  return `${event.contentId ?? ''}:${event.stepId ?? 'global'}`;
}

function nudgeMessage(reason: AutoHelpNudge['reason']): string {
  switch (reason) {
    case 'fail_streak':
      return 'Stuck on this check? Open Need help? for a guiding question — not the answer.';
    case 'hint_then_fail':
      return 'Hints alone may not be enough. Ask Copilot for a Socratic nudge.';
    case 'seek_thrash':
      return 'Skipping around the clip a lot? Need help? can unpack that moment.';
    case 'step_idle':
      return 'Still here? Tap Need help? if you want a small next step.';
    case 'flagged':
      return 'You flagged this as confusing — Copilot can walk it with you.';
    default:
      return 'Need help?';
  }
}

/**
 * Deterministic auto-help from a batch of newly accepted events + recent history.
 * Never invents answers; only soft nudges.
 */
export function evaluateAutoHelp(input: {
  config: AutoHelpConfig;
  now: Date;
  incoming: LearningEventEnvelope[];
  recentForScope: LearningEventEnvelope[];
  state: ScopeState;
}): AutoHelpNudge | null {
  const { config, now, incoming, recentForScope, state } = input;
  if (!config.enabled) {
    return null;
  }
  if (state.suppressedUntil && state.suppressedUntil.getTime() > now.getTime()) {
    return null;
  }
  if (state.lastNudgeAt && now.getTime() - state.lastNudgeAt.getTime() < config.suppressMs) {
    return null;
  }

  const all = [...recentForScope, ...incoming];
  const lastIncoming = incoming[incoming.length - 1];
  if (!lastIncoming) {
    return null;
  }

  for (const event of incoming) {
    if (event.eventType === 'COPILOT_QUESTION_ASKED' || event.eventType === 'AUTO_HELP_NUDGE_DISMISSED') {
      return null;
    }
  }

  for (const event of incoming) {
    if (event.eventType === 'CONCEPT_FLAGGED_CONFUSING') {
      return {
        reason: 'flagged',
        pathwayId: event.pathwayId ?? null,
        contentId: event.contentId ?? null,
        stepId: event.stepId ?? null,
        message: nudgeMessage('flagged'),
      };
    }
    if (event.eventType === 'STEP_IDLE') {
      return {
        reason: 'step_idle',
        pathwayId: event.pathwayId ?? null,
        contentId: event.contentId ?? null,
        stepId: event.stepId ?? null,
        message: nudgeMessage('step_idle'),
      };
    }
  }

  let failCount = state.failCount;
  let hadHint = state.hadHint;
  for (const event of incoming) {
    if (event.eventType === 'QUIZ_HINT_REQUESTED') {
      hadHint = true;
    }
    if (event.eventType === 'QUIZ_ANSWERED' && isTrustedQuizGrade(event.payload)) {
      if (event.payload.correct === false) {
        failCount += 1;
        if (hadHint) {
          return {
            reason: 'hint_then_fail',
            pathwayId: event.pathwayId ?? null,
            contentId: event.contentId ?? null,
            stepId: event.stepId ?? null,
            message: nudgeMessage('hint_then_fail'),
          };
        }
        if (failCount >= config.failStreakThreshold) {
          return {
            reason: 'fail_streak',
            pathwayId: event.pathwayId ?? null,
            contentId: event.contentId ?? null,
            stepId: event.stepId ?? null,
            message: nudgeMessage('fail_streak'),
          };
        }
      } else {
        failCount = 0;
        hadHint = false;
      }
    }
  }

  const seekCutoff = now.getTime() - config.seekWindowMs;
  const seeks = all.filter(
    (e) =>
      e.eventType === 'VIDEO_SEEKED' &&
      new Date(e.occurredAt).getTime() >= seekCutoff &&
      scopeKey(e) === scopeKey(lastIncoming),
  );
  if (seeks.length >= config.seekThrashThreshold) {
    return {
      reason: 'seek_thrash',
      pathwayId: lastIncoming.pathwayId ?? null,
      contentId: lastIncoming.contentId ?? null,
      stepId: lastIncoming.stepId ?? null,
      message: nudgeMessage('seek_thrash'),
    };
  }

  return null;
}

export function nextFailCount(state: ScopeState, incoming: LearningEventEnvelope[]): number {
  let failCount = state.failCount;
  for (const event of incoming) {
    if (event.eventType === 'QUIZ_ANSWERED' && isTrustedQuizGrade(event.payload)) {
      if (event.payload.correct === false) {
        failCount += 1;
      } else {
        failCount = 0;
      }
    }
    if (event.eventType === 'STEP_ENTERED' || event.eventType === 'STEP_COMPLETED') {
      failCount = 0;
    }
  }
  return failCount;
}

export { scopeKey };
