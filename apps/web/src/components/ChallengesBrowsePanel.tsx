'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchMe,
  listLearnerChallenges,
  listMyChallengeAttempts,
  type ChallengeAttempt,
  type LearnerChallenge,
} from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function ChallengesBrowsePanel({ locale, dictionary }: Props) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [challenges, setChallenges] = useState<LearnerChallenge[]>([]);
  const [attempts, setAttempts] = useState<ChallengeAttempt[]>([]);

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    if (!me?.user) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    const [challengeResult, attemptResult] = await Promise.all([
      listLearnerChallenges(),
      listMyChallengeAttempts(),
    ]);
    setChallenges(challengeResult.challenges);
    setAttempts(attemptResult.attempts);
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
        <h2 className="section-title">{dictionary['challenges.title']}</h2>
        <p>{dictionary['challenges.needSignIn']}</p>
        <Link className="btn btn-primary" href={`/${locale}/sign-up`}>
          {dictionary['nav.signUp']}
        </Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <div>
        <h2 className="section-title">{dictionary['challenges.title']}</h2>
        <p className="section-support">{dictionary['challenges.hint']}</p>
      </div>

      {challenges.length === 0 ? (
        <p className="muted">{dictionary['challenges.empty']}</p>
      ) : (
        <div className="worlds">
          {challenges.map((challenge) => {
            const done = attempts.some(
              (row) => row.challengeId === challenge.id && row.status === 'completed',
            );
            return (
              <Link
                key={challenge.id}
                className="path-card"
                href={`/${locale}/challenges/${challenge.id}`}
                data-challenge-slug={challenge.slug ?? ''}
              >
                <span className={`badge ${done ? '' : 'join'}`}>
                  {done ? dictionary['challenges.completed'] : 'Challenge'}
                </span>
                <h3>{challenge.title}</h3>
                {challenge.summary ? <p>{challenge.summary}</p> : null}
                <p className="muted">
                  {done ? dictionary['challenges.completed'] : dictionary['challenges.start']} →
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
