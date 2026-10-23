import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AUTO_HELP_CONFIG,
  evaluateAutoHelp,
  nextFailCount,
  type ScopeState,
} from './auto-help-rules.js';

const baseState: ScopeState = {
  failCount: 0,
  hadHint: false,
  lastNudgeAt: null,
  suppressedUntil: null,
};

function event(
  type: string,
  extras: Partial<{
    payload: Record<string, unknown>;
    stepId: string;
    contentId: string;
    occurredAt: string;
  }> = {},
) {
  return {
    eventId: '00000000-0000-4000-8000-000000000001',
    eventType: type as never,
    pathwayId: 'know-yourself',
    contentId: extras.contentId ?? 'pause-before-react',
    stepId: extras.stepId ?? 'quiz-1',
    occurredAt: extras.occurredAt ?? '2026-10-23T12:00:00.000Z',
    payload: extras.payload ?? {},
  };
}

describe('evaluateAutoHelp', () => {
  const now = new Date('2026-10-23T12:00:10.000Z');

  it('nudges after fail streak', () => {
    const nudge = evaluateAutoHelp({
      config: DEFAULT_AUTO_HELP_CONFIG,
      now,
      incoming: [
        event('QUIZ_ANSWERED', { payload: { correct: false, graded: true } }),
        event('QUIZ_ANSWERED', {
          payload: { correct: false, graded: true },
          occurredAt: '2026-10-23T12:00:05.000Z',
        }),
      ],
      recentForScope: [],
      state: { ...baseState, failCount: 0 },
    });
    expect(nudge?.reason).toBe('fail_streak');
  });

  it('ignores untrusted client QUIZ_ANSWERED (no graded:true)', () => {
    const nudge = evaluateAutoHelp({
      config: DEFAULT_AUTO_HELP_CONFIG,
      now,
      incoming: [
        event('QUIZ_ANSWERED', { payload: { correct: false, pending_server_grade: true } }),
        event('QUIZ_ANSWERED', { payload: { correct: false } }),
      ],
      recentForScope: [],
      state: baseState,
    });
    expect(nudge).toBeNull();
  });

  it('nudges stronger after hint then fail', () => {
    const nudge = evaluateAutoHelp({
      config: DEFAULT_AUTO_HELP_CONFIG,
      now,
      incoming: [
        event('QUIZ_HINT_REQUESTED'),
        event('QUIZ_ANSWERED', { payload: { correct: false, graded: true } }),
      ],
      recentForScope: [],
      state: baseState,
    });
    expect(nudge?.reason).toBe('hint_then_fail');
  });

  it('suppresses when recently nudged', () => {
    const nudge = evaluateAutoHelp({
      config: DEFAULT_AUTO_HELP_CONFIG,
      now,
      incoming: [
        event('QUIZ_ANSWERED', { payload: { correct: false, graded: true } }),
        event('QUIZ_ANSWERED', { payload: { correct: false, graded: true } }),
      ],
      recentForScope: [],
      state: { ...baseState, lastNudgeAt: new Date('2026-10-23T11:55:00.000Z') },
    });
    expect(nudge).toBeNull();
  });

  it('immediate nudge on concept flag', () => {
    const nudge = evaluateAutoHelp({
      config: DEFAULT_AUTO_HELP_CONFIG,
      now,
      incoming: [event('CONCEPT_FLAGGED_CONFUSING', { payload: { concept_id: 'pause' } })],
      recentForScope: [],
      state: baseState,
    });
    expect(nudge?.reason).toBe('flagged');
  });

  it('nextFailCount resets on correct answer', () => {
    expect(
      nextFailCount({ ...baseState, failCount: 2 }, [
        event('QUIZ_ANSWERED', { payload: { correct: true, graded: true } }),
      ]),
    ).toBe(0);
  });
});
