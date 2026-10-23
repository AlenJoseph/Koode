'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  completeChallengeAttempt,
  fetchMe,
  listLearnerChallenges,
  listMyChallengeAttempts,
  startChallengeAttempt,
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
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  function openAttempt(challengeId: string): ChallengeAttempt | undefined {
    return attempts.find(
      (row) => row.challengeId === challengeId && row.status === 'in_progress',
    );
  }

  function completedAttempt(challengeId: string): ChallengeAttempt | undefined {
    return attempts.find((row) => row.challengeId === challengeId && row.status === 'completed');
  }

  async function onStart(challengeId: string) {
    setError(false);
    setBusyId(challengeId);
    try {
      const { attempt } = await startChallengeAttempt(challengeId);
      setAttempts((prev) => {
        if (prev.some((row) => row.id === attempt.id)) {
          return prev.map((row) => (row.id === attempt.id ? attempt : row));
        }
        return [attempt, ...prev];
      });
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  async function onComplete(attemptId: string, challengeId: string) {
    setError(false);
    setBusyId(challengeId);
    try {
      const { attempt } = await completeChallengeAttempt(attemptId);
      setAttempts((prev) => prev.map((row) => (row.id === attemptId ? attempt : row)));
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  if (signedIn === null) {
    return <p className="muted">{dictionary['health.ok']}…</p>;
  }

  if (!signedIn) {
    return (
      <div className="panel stack">
        <h2>{dictionary['challenges.title']}</h2>
        <p>{dictionary['challenges.needSignIn']}</p>
        <Link className="button" href={`/${locale}/sign-up`}>
          {dictionary['nav.signUp']}
        </Link>
      </div>
    );
  }

  return (
    <div className="panel stack">
      <h2>{dictionary['challenges.title']}</h2>
      <p className="muted">{dictionary['challenges.hint']}</p>
      {error ? <p role="alert">{dictionary['challenges.error']}</p> : null}

      {challenges.length === 0 ? (
        <p className="muted">{dictionary['challenges.empty']}</p>
      ) : (
        <ul className="stack">
          {challenges.map((challenge) => {
            const open = openAttempt(challenge.id);
            const done = completedAttempt(challenge.id);
            return (
              <li key={challenge.id} className="stack">
                <strong>{challenge.title}</strong>
                {challenge.summary ? <p>{challenge.summary}</p> : null}
                {done ? (
                  <p className="muted">{dictionary['challenges.completed']}</p>
                ) : open ? (
                  <button
                    type="button"
                    disabled={busyId === challenge.id}
                    onClick={() => void onComplete(open.id, challenge.id)}
                  >
                    {dictionary['challenges.complete']}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === challenge.id}
                    onClick={() => void onStart(challenge.id)}
                  >
                    {dictionary['challenges.start']}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
