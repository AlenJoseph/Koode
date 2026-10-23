import { describe, expect, it } from 'vitest';
import {
  SUPPORT_INDICATOR_LEGEND,
  aggregateLearningSupport,
  buildLearnerSignals,
  challengeStatsFromAttempts,
  classifyLearner,
  supportIndicatorForBucket,
} from './aggregator.js';

describe('E5-S1 learning-support aggregator', () => {
  it('classifies empty engagement as help_needed', () => {
    expect(
      classifyLearner({ userId: 'u1', displayName: 'A', attemptCount: 0, completedCount: 0 }),
    ).toBe('help_needed');
  });

  it('classifies attempts with zero completions as help_needed', () => {
    expect(
      classifyLearner({ userId: 'u1', displayName: 'A', attemptCount: 3, completedCount: 0 }),
    ).toBe('help_needed');
  });

  it('classifies high completion as strength', () => {
    expect(
      classifyLearner({ userId: 'u1', displayName: 'A', attemptCount: 4, completedCount: 4 }),
    ).toBe('strength');
  });

  it('classifies low completion as weakness', () => {
    expect(
      classifyLearner({ userId: 'u1', displayName: 'A', attemptCount: 5, completedCount: 1 }),
    ).toBe('weakness');
  });

  it('classifies mid progress as growth', () => {
    expect(
      classifyLearner({ userId: 'u1', displayName: 'A', attemptCount: 2, completedCount: 1 }),
    ).toBe('growth');
  });

  it('aggregates section buckets from roster signals', () => {
    const signals = buildLearnerSignals([
      { userId: '1', displayName: 'A', attemptCount: 4, completedCount: 4 },
      { userId: '2', displayName: 'B', attemptCount: 5, completedCount: 1 },
      { userId: '3', displayName: 'C', attemptCount: 2, completedCount: 1 },
      { userId: '4', displayName: 'D', attemptCount: 0, completedCount: 0 },
    ]);
    expect(aggregateLearningSupport(signals)).toEqual({
      strength: 1,
      weakness: 1,
      growth: 1,
      helpNeeded: 1,
    });
  });

  it('builds per-challenge completion stats', () => {
    const stats = challengeStatsFromAttempts([
      { challengeId: 'c1', title: 'Loops', status: 'completed' },
      { challengeId: 'c1', title: 'Loops', status: 'in_progress' },
      { challengeId: 'c2', title: 'Vars', status: 'completed' },
    ]);
    expect(stats).toEqual([
      {
        challengeId: 'c1',
        title: 'Loops',
        started: 2,
        completed: 1,
        completionRate: 0.5,
      },
      {
        challengeId: 'c2',
        title: 'Vars',
        started: 1,
        completed: 1,
        completionRate: 1,
      },
    ]);
  });
});

describe('E5-S2 support indicator', () => {
  it('maps buckets to green / orange / red', () => {
    expect(supportIndicatorForBucket('strength')).toBe('green');
    expect(supportIndicatorForBucket('growth')).toBe('orange');
    expect(supportIndicatorForBucket('weakness')).toBe('orange');
    expect(supportIndicatorForBucket('help_needed')).toBe('red');
  });

  it('attaches supportIndicator on learner signals', () => {
    const [signal] = buildLearnerSignals([
      { userId: '1', displayName: 'A', attemptCount: 0, completedCount: 0 },
    ]);
    expect(signal?.supportIndicator).toBe('red');
  });

  it('legend states non-clinical / indicative only', () => {
    expect(SUPPORT_INDICATOR_LEGEND.toLowerCase()).toContain('indicative');
    expect(SUPPORT_INDICATOR_LEGEND.toLowerCase()).toContain('not a clinical diagnosis');
  });
});
