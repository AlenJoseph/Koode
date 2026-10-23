import { challengeAttempts, challenges, type Database } from '@koode/database';
import { eq, inArray } from 'drizzle-orm';
import type { ClassroomService } from '../classroom/service.js';
import {
  aggregateLearningSupport,
  buildLearnerSignals,
  challengeStatsFromAttempts,
  type ChallengeLearningStat,
  type LearnerLearningSignal,
  type SectionLearningAggregates,
} from './aggregator.js';

export type SectionInsights = {
  sectionId: string;
  aggregates: SectionLearningAggregates;
  learners: LearnerLearningSignal[];
  byChallenge: ChallengeLearningStat[];
};

export function createInsightsService(database: Database, classroom: ClassroomService) {
  const { db } = database;

  return {
    async getSectionLearningInsights(
      teacherId: string,
      sectionId: string,
    ): Promise<SectionInsights> {
      const roster = await classroom.listRoster(teacherId, sectionId);
      const userIds = roster.map((row) => row.userId);

      const attempts =
        userIds.length === 0
          ? []
          : await db
              .select({
                userId: challengeAttempts.userId,
                challengeId: challengeAttempts.challengeId,
                status: challengeAttempts.status,
                title: challenges.title,
              })
              .from(challengeAttempts)
              .innerJoin(challenges, eq(challengeAttempts.challengeId, challenges.id))
              .where(inArray(challengeAttempts.userId, userIds));

      const byUser = new Map<string, { attemptCount: number; completedCount: number }>();
      for (const id of userIds) {
        byUser.set(id, { attemptCount: 0, completedCount: 0 });
      }
      for (const row of attempts) {
        const entry = byUser.get(row.userId);
        if (!entry) continue;
        entry.attemptCount += 1;
        if (row.status === 'completed') {
          entry.completedCount += 1;
        }
      }

      const learnerStats = roster.map((row) => {
        const counts = byUser.get(row.userId) ?? { attemptCount: 0, completedCount: 0 };
        return {
          userId: row.userId,
          displayName: row.displayName,
          attemptCount: counts.attemptCount,
          completedCount: counts.completedCount,
        };
      });

      const learners = buildLearnerSignals(learnerStats);
      const aggregates = aggregateLearningSupport(learners);
      const byChallenge = challengeStatsFromAttempts(
        attempts.map((row) => ({
          challengeId: row.challengeId,
          title: row.title,
          status: row.status,
        })),
      );

      return { sectionId, aggregates, learners, byChallenge };
    },
  };
}
