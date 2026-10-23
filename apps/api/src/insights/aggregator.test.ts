import { describe, expect, it } from 'vitest';
import {
  aggregateLearningSupport,
  buildLearnerSignals,
  challengeStatsFromAttempts,
  classifyLearner,
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
