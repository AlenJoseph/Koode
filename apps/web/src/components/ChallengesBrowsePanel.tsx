'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  completeChallengeAttempt,
  fetchChallengeQuiz,
  fetchMe,
  listLearnerChallenges,
  listMyChallengeAttempts,
  startChallengeAttempt,
  submitChallengeQuiz,
  type ChallengeAttempt,
  type LearnerChallenge,
  type LearnerQuiz,
  type QuizSubmitResult,
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
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<LearnerQuiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [quizMissing, setQuizMissing] = useState(false);

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
    setResult(null);
    setQuizMissing(false);
    try {
      const { attempt } = await startChallengeAttempt(challengeId);
      setAttempts((prev) => {
        if (prev.some((row) => row.id === attempt.id)) {
          return prev.map((row) => (row.id === attempt.id ? attempt : row));
        }
        return [attempt, ...prev];
      });
      try {
        const { quiz: loaded } = await fetchChallengeQuiz(challengeId);
        setQuiz(loaded);
        setAnswers({});
        setActiveChallengeId(challengeId);
      } catch {
        setQuiz(null);
        setQuizMissing(true);
        setActiveChallengeId(challengeId);
      }
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
      setActiveChallengeId(null);
      setQuiz(null);
      setResult(null);
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  async function onSubmitQuiz(challengeId: string) {
    const open = openAttempt(challengeId);
    if (!open || !quiz) {
      return;
    }
    setError(false);
    setBusyId(challengeId);
    try {
      const payload = quiz.quiz.map((item) => ({
        quizItemId: item.id,
        optionId: answers[item.id]!,
      }));
      if (payload.some((row) => !row.optionId)) {
        setError(true);
        return;
      }
      const submitted = await submitChallengeQuiz(open.id, payload);
      setResult(submitted);
      setAttempts((prev) =>
        prev.map((row) => (row.id === submitted.attempt.id ? submitted.attempt : row)),
      );
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
            const isActive = activeChallengeId === challenge.id;
            return (
              <li key={challenge.id} className="stack" data-challenge-slug={challenge.slug ?? ''}>
                <strong>{challenge.title}</strong>
                {challenge.summary ? <p>{challenge.summary}</p> : null}
                {done && !isActive ? (
                  <p className="muted">{dictionary['challenges.completed']}</p>
                ) : null}
                {!done && !open ? (
                  <button
                    type="button"
                    disabled={busyId === challenge.id}
                    onClick={() => void onStart(challenge.id)}
                  >
                    {dictionary['challenges.start']}
                  </button>
                ) : null}
                {open && !isActive ? (
                  <button
                    type="button"
                    disabled={busyId === challenge.id}
                    onClick={() => void onStart(challenge.id)}
                  >
                    {dictionary['challenges.openQuiz']}
                  </button>
                ) : null}

                {isActive && quiz ? (
                  <div className="stack" data-testid="challenge-quiz">
                    <p>
                      <strong>{dictionary['challenges.objectives']}</strong>
                    </p>
                    <ul>
                      {quiz.objectives.map((objective) => (
                        <li key={objective}>{objective}</li>
                      ))}
                    </ul>
                    <p>{quiz.briefMarkdown.replace(/[#*_`]/g, '').slice(0, 400)}</p>
                    {quiz.quiz.map((item) => (
                      <fieldset key={item.id} className="stack">
                        <legend>{item.prompt}</legend>
                        {item.options.map((option) => (
                          <label key={option.id}>
                            <input
                              type="radio"
                              name={`${challenge.id}-${item.id}`}
                              value={option.id}
                              checked={answers[item.id] === option.id}
                              disabled={Boolean(result)}
                              onChange={() =>
                                setAnswers((prev) => ({ ...prev, [item.id]: option.id }))
                              }
                            />{' '}
                            {option.label}
                          </label>
                        ))}
                      </fieldset>
                    ))}
                    {!result ? (
                      <button
                        type="button"
                        disabled={
                          busyId === challenge.id ||
                          quiz.quiz.some((item) => !answers[item.id])
                        }
                        onClick={() => void onSubmitQuiz(challenge.id)}
                      >
                        {dictionary['challenges.submitQuiz']}
                      </button>
                    ) : (
                      <div className="stack" data-testid="quiz-result">
                        <p>
                          {dictionary['challenges.quizScore']}: {result.score.correct}/
                          {result.score.total}
                        </p>
                        {result.items.map((item) => (
                          <p key={item.quizItemId} className="muted">
                            {item.isCorrect ? '✓' : '✗'} {item.teachBack}
                          </p>
                        ))}
                        <p className="muted">{dictionary['challenges.completed']}</p>
                      </div>
                    )}
                  </div>
                ) : null}

                {isActive && quizMissing ? (
                  <div className="stack">
                    <p className="muted">{dictionary['challenges.noQuiz']}</p>
                    {open ? (
                      <button
                        type="button"
                        disabled={busyId === challenge.id}
                        onClick={() => void onComplete(open.id, challenge.id)}
                      >
                        {dictionary['challenges.complete']}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
