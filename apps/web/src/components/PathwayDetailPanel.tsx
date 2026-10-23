'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  enrollInPathway,
  fetchMe,
  listLearnerChallenges,
  listLearnerPathways,
  listMyChallengeAttempts,
  listMyPathwayEnrollments,
  type ChallengeAttempt,
  type LearnerChallenge,
  type LearnerPathway,
} from '@/lib/api';
import { pathwayBadge } from '@/lib/pathway-meta';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
  pathwayId: string;
};

export function PathwayDetailPanel({ locale, dictionary, pathwayId }: Props) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [pathway, setPathway] = useState<LearnerPathway | null>(null);
  const [challenges, setChallenges] = useState<LearnerChallenge[]>([]);
  const [attempts, setAttempts] = useState<ChallengeAttempt[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    if (!me?.user) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    const [pathways, challengeResult, attemptResult, enrollmentResult] = await Promise.all([
      listLearnerPathways(),
      listLearnerChallenges(),
      listMyChallengeAttempts(),
      listMyPathwayEnrollments(),
    ]);
    const found = pathways.pathways.find((row) => row.id === pathwayId) ?? null;
    setPathway(found);
    setChallenges(challengeResult.challenges.filter((row) => row.pathwayId === pathwayId));
    setAttempts(attemptResult.attempts);
    setEnrolled(enrollmentResult.enrollments.some((row) => row.pathwayId === pathwayId));
  }, [pathwayId]);

  useEffect(() => {
    void refresh().catch(() => setSignedIn(false));
  }, [refresh]);

  async function onEnroll() {
    setBusy(true);
    setError(false);
    try {
      await enrollInPathway(pathwayId);
      setEnrolled(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (signedIn === null) {
    return <p className="muted">{dictionary['health.ok']}…</p>;
  }

  if (!signedIn) {
    return (
      <div className="panel stack">
        <p>{dictionary['pathways.needSignIn']}</p>
        <Link className="btn btn-primary" href={`/${locale}/sign-up`}>
          {dictionary['nav.signUp']}
        </Link>
      </div>
    );
  }

  if (!pathway) {
    return (
      <div className="panel stack">
        <Link className="back-link" href={`/${locale}/pathways`}>
          ← {dictionary['nav.pathways']}
        </Link>
        <p className="muted">{dictionary['pathways.empty']}</p>
      </div>
    );
  }

  const badge = pathwayBadge(pathway.slug);

  return (
    <div className="stack">
      <Link className="back-link" href={`/${locale}/pathways`}>
        ← {dictionary['nav.pathways']}
      </Link>

      <section className="hero-strip">
        <div className="blob a" aria-hidden="true" />
        <span className={badge.className}>{badge.label}</span>
        <h1 className="brand-hero" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
          {pathway.title}
        </h1>
        <p className="support">{pathway.summary}</p>
        <div className="ctas" style={{ marginTop: '1rem' }}>
          {enrolled ? (
            <span className="streak">{dictionary['pathways.enrolled']}</span>
          ) : (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onEnroll()}>
              {dictionary['pathways.start']}
            </button>
          )}
        </div>
      </section>

      {error ? <p role="alert">{dictionary['pathways.error']}</p> : null}

      <div className="board-card stack">
        <h2 className="section-title">{dictionary['challenges.title']}</h2>
        <p className="section-support">{dictionary['challenges.hint']}</p>
        {challenges.length === 0 ? (
          <p className="muted">{dictionary['challenges.empty']}</p>
        ) : (
          <div className="path-row">
            {challenges.map((challenge, index) => {
              const done = attempts.some(
                (row) => row.challengeId === challenge.id && row.status === 'completed',
              );
              const open = attempts.some(
                (row) => row.challengeId === challenge.id && row.status === 'in_progress',
              );
              const state = done ? 'done' : open || index === 0 ? 'active' : '';
              return (
                <Link
                  key={challenge.id}
                  className={`node ${state}`}
                  href={`/${locale}/challenges/${challenge.id}`}
                  data-challenge-slug={challenge.slug ?? ''}
                >
                  <div className="dot" />
                  <div>
                    <strong>{challenge.title}</strong>
                    <span>{challenge.summary}</span>
                  </div>
                  <span className="muted">{done ? '✓' : '→'}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
