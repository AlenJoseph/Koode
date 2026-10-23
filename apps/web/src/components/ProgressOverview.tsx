'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ProjectsPanel } from '@/components/ProjectsPanel';
import {
  fetchMe,
  listLearnerChallenges,
  listLearnerPathways,
  listMyChallengeAttempts,
  listMyPathwayEnrollments,
  listMyProjects,
  type ChallengeAttempt,
  type LearnerChallenge,
  type LearnerPathway,
  type LearnerProject,
  type PathwayEnrollment,
} from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function ProgressOverview({ locale, dictionary }: Props) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [pathways, setPathways] = useState<LearnerPathway[]>([]);
  const [challenges, setChallenges] = useState<LearnerChallenge[]>([]);
  const [enrollments, setEnrollments] = useState<PathwayEnrollment[]>([]);
  const [attempts, setAttempts] = useState<ChallengeAttempt[]>([]);
  const [projects, setProjects] = useState<LearnerProject[]>([]);

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    if (!me?.user) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    const [pathwayResult, challengeResult, enrollmentResult, attemptResult, projectResult] =
      await Promise.all([
        listLearnerPathways(),
        listLearnerChallenges(),
        listMyPathwayEnrollments(),
        listMyChallengeAttempts(),
        listMyProjects(),
      ]);
    setPathways(pathwayResult.pathways);
    setChallenges(challengeResult.challenges);
    setEnrollments(enrollmentResult.enrollments);
    setAttempts(attemptResult.attempts);
    setProjects(projectResult.projects);
  }, []);

  useEffect(() => {
    void refresh().catch(() => setSignedIn(false));
  }, [refresh]);

  if (signedIn === null) {
    return <p className="muted">{dictionary['health.ok']}…</p>;
  }

  if (!signedIn) {
    return (
      <div className="panel stack">
        <h2>{dictionary['progress.title']}</h2>
        <p>{dictionary['progress.needSignIn']}</p>
        <Link className="button" href={`/${locale}/sign-up`}>
          {dictionary['nav.signUp']}
        </Link>
      </div>
    );
  }

  const pathwayTitle = (id: string) =>
    pathways.find((pathway) => pathway.id === id)?.title ?? id;
  const challengeTitle = (id: string) =>
    challenges.find((challenge) => challenge.id === id)?.title ?? id;

  return (
    <div className="stack">
      <div className="panel stack">
        <h2>{dictionary['progress.title']}</h2>
        <p className="muted">{dictionary['progress.hint']}</p>

        <h3>{dictionary['progress.enrollments']}</h3>
        {enrollments.length === 0 ? (
          <p className="muted">{dictionary['progress.enrollmentsEmpty']}</p>
        ) : (
          <ul className="stack">
            {enrollments.map((enrollment) => (
              <li key={enrollment.id}>
                {pathwayTitle(enrollment.pathwayId)} · {enrollment.status}
              </li>
            ))}
          </ul>
        )}

        <h3>{dictionary['progress.attempts']}</h3>
        {attempts.length === 0 ? (
          <p className="muted">{dictionary['progress.attemptsEmpty']}</p>
        ) : (
          <ul className="stack">
            {attempts.map((attempt) => (
              <li key={attempt.id}>
                {challengeTitle(attempt.challengeId)} · {attempt.status}
              </li>
            ))}
          </ul>
        )}

        <h3>{dictionary['progress.projects']}</h3>
        {projects.length === 0 ? (
          <p className="muted">{dictionary['progress.projectsEmpty']}</p>
        ) : (
          <ul className="stack">
            {projects.map((project) => (
              <li key={project.id}>
                <strong>{project.title}</strong>
                {project.summary ? ` — ${project.summary}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProjectsPanel locale={locale} dictionary={dictionary} />
    </div>
  );
}
