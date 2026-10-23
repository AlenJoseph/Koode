/** Deterministic learning-support buckets (E5-S1). Not clinical / diagnostic. */

export type LearningSupportBucket = 'strength' | 'weakness' | 'growth' | 'help_needed';

/** Wellbeing-style R/O/G support colour (E5-S2) — indicative only. */
export type SupportIndicator = 'green' | 'orange' | 'red';

export const SUPPORT_INDICATOR_LEGEND =
  'These colours are an indicative support signal from learning activity only. They are not a clinical diagnosis or medical advice.';

export type LearnerAttemptStats = {
  userId: string;
  displayName: string;
  attemptCount: number;
  completedCount: number;
};

export type LearnerLearningSignal = LearnerAttemptStats & {
  bucket: LearningSupportBucket;
  supportIndicator: SupportIndicator;
  completionRate: number;
};

export type SectionLearningAggregates = {
  strength: number;
  weakness: number;
  growth: number;
  helpNeeded: number;
};

export type ChallengeLearningStat = {
  challengeId: string;
  title: string;
  started: number;
  completed: number;
  completionRate: number;
};

/**
 * Classify one learner from attempt totals.
 * - no / failed engagement → help_needed
 * - low completion rate → weakness
 * - solid completions → strength
 * - otherwise making progress → growth
 */
export function classifyLearner(stats: LearnerAttemptStats): LearningSupportBucket {
  if (stats.attemptCount === 0) {
    return 'help_needed';
  }
  if (stats.completedCount === 0) {
    return 'help_needed';
  }
  const rate = stats.completedCount / stats.attemptCount;
  if (rate >= 0.75 && stats.completedCount >= 2) {
    return 'strength';
  }
  if (rate < 0.4) {
    return 'weakness';
  }
  return 'growth';
}

/** Map learning bucket → R/O/G support colour for teachers. */
export function supportIndicatorForBucket(bucket: LearningSupportBucket): SupportIndicator {
  if (bucket === 'strength') return 'green';
  if (bucket === 'help_needed') return 'red';
  return 'orange';
}

export function buildLearnerSignals(roster: LearnerAttemptStats[]): LearnerLearningSignal[] {
  return roster.map((row) => {
    const completionRate =
      row.attemptCount === 0 ? 0 : row.completedCount / row.attemptCount;
    const bucket = classifyLearner(row);
    return {
      ...row,
      bucket,
      supportIndicator: supportIndicatorForBucket(bucket),
      completionRate,
    };
  });
}

export function aggregateLearningSupport(
  signals: LearnerLearningSignal[],
): SectionLearningAggregates {
  const aggregates: SectionLearningAggregates = {
    strength: 0,
    weakness: 0,
    growth: 0,
    helpNeeded: 0,
  };
  for (const signal of signals) {
    if (signal.bucket === 'strength') aggregates.strength += 1;
    else if (signal.bucket === 'weakness') aggregates.weakness += 1;
    else if (signal.bucket === 'growth') aggregates.growth += 1;
    else aggregates.helpNeeded += 1;
  }
  return aggregates;
}

export function challengeStatsFromAttempts(
  rows: Array<{ challengeId: string; title: string; status: string }>,
): ChallengeLearningStat[] {
  const byId = new Map<string, { title: string; started: number; completed: number }>();
  for (const row of rows) {
    const entry = byId.get(row.challengeId) ?? {
      title: row.title,
      started: 0,
      completed: 0,
    };
    entry.started += 1;
    if (row.status === 'completed') {
      entry.completed += 1;
    }
    byId.set(row.challengeId, entry);
  }
  return [...byId.entries()]
    .map(([challengeId, value]) => ({
      challengeId,
      title: value.title,
      started: value.started,
      completed: value.completed,
      completionRate: value.started === 0 ? 0 : value.completed / value.started,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
