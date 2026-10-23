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
  challengeId: string;
};

export function ChallengePlayPanel({ locale, dictionary, challengeId }: Props) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [challenge, setChallenge] = useState<LearnerChallenge | null>(null);
  const [attempt, setAttempt] = useState<ChallengeAttempt | null>(null);
  const [quiz, setQuiz] = useState<LearnerQuiz | null>(null);
  const [quizMissing, setQuizMissing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

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
    const found = challengeResult.challenges.find((row) => row.id === challengeId) ?? null;
    setChallenge(found);
    const open =
      attemptResult.attempts.find(
        (row) => row.challengeId === challengeId && row.status === 'in_progress',
      ) ??
      attemptResult.attempts.find(
        (row) => row.challengeId === challengeId && row.status === 'completed',
      ) ??
      null;
    setAttempt(open);
  }, [challengeId]);

  useEffect(() => {
    void refresh().catch(() => setSignedIn(false));
  }, [refresh]);

  async function onStart() {
    setBusy(true);
    setError(false);
    setResult(null);
    setQuizMissing(false);
    try {
      const { attempt: started } = await startChallengeAttempt(challengeId);
      setAttempt(started);
      try {
        const { quiz: loaded } = await fetchChallengeQuiz(challengeId);
        setQuiz(loaded);
        setAnswers({});
      } catch {
        setQuiz(null);
        setQuizMissing(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit() {
    if (!attempt || !quiz || attempt.status === 'completed') {
      return;
    }
    setBusy(true);
    setError(false);
    try {
      const payload = quiz.quiz.map((item) => ({
        quizItemId: item.id,
        optionId: answers[item.id]!,
      }));
      if (payload.some((row) => !row.optionId)) {
        setError(true);
        return;
      }
      const submitted = await submitChallengeQuiz(attempt.id, payload);
      setResult(submitted);
      setAttempt(submitted.attempt);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function onCompleteStub() {
    if (!attempt) {
      return;
    }
    setBusy(true);
    try {
      const { attempt: done } = await completeChallengeAttempt(attempt.id);
      setAttempt(done);
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
        <p>{dictionary['challenges.needSignIn']}</p>
        <Link className="btn btn-primary" href={`/${locale}/sign-up`}>
          {dictionary['nav.signUp']}
        </Link>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="panel stack">
        <Link className="back-link" href={`/${locale}/challenges`}>
          ← {dictionary['nav.challenges']}
        </Link>
        <p className="muted">{dictionary['challenges.empty']}</p>
      </div>
    );
  }

  const backHref = challenge.pathwayId
    ? `/${locale}/pathways/${challenge.pathwayId}`
    : `/${locale}/challenges`;

  return (
    <div className="stack">
      <Link className="back-link" href={backHref}>
        ← {challenge.pathwayId ? dictionary['nav.pathways'] : dictionary['nav.challenges']}
      </Link>

      <section className="hero-strip">
        <div className="blob b" aria-hidden="true" />
        <span className="badge">{challenge.slug ?? 'Challenge'}</span>
        <h1 className="brand-hero" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)' }}>
          {challenge.title}
        </h1>
        <p className="support">{challenge.summary}</p>
        {attempt?.status === 'completed' ? (
          <span className="streak" style={{ marginTop: '0.75rem' }}>
            {dictionary['challenges.completed']}
          </span>
        ) : null}
      </section>

      {error ? <p role="alert">{dictionary['challenges.error']}</p> : null}

      <div className="board-card stack" data-challenge-slug={challenge.slug ?? ''}>
        {!attempt || (attempt.status === 'in_progress' && !quiz && !quizMissing) ? (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onStart()}>
            {attempt ? dictionary['challenges.openQuiz'] : dictionary['challenges.start']}
          </button>
        ) : null}

        {quiz ? (
          <div className="stack" data-testid="challenge-quiz">
            <h2 className="section-title">{dictionary['challenges.objectives']}</h2>
            <ul>
              {quiz.objectives.map((objective) => (
                <li key={objective}>
                  <strong>{objective}</strong>
                </li>
              ))}
            </ul>
            <p className="muted">{quiz.briefMarkdown.replace(/[#*_`]/g, '').slice(0, 480)}</p>

            {quiz.quiz.map((item) => (
              <fieldset key={item.id} className="quiz-fieldset">
                <legend>{item.prompt}</legend>
                {item.options.map((option) => (
                  <label key={option.id}>
                    <input
                      type="radio"
                      name={`${challenge.id}-${item.id}`}
                      value={option.id}
                      checked={answers[item.id] === option.id}
                      disabled={Boolean(result) || attempt?.status === 'completed'}
                      onChange={() => setAnswers((prev) => ({ ...prev, [item.id]: option.id }))}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
            ))}

            {!result && attempt?.status === 'in_progress' ? (
              <button
                type="button"
                className="btn btn-accent"
                disabled={busy || quiz.quiz.some((item) => !answers[item.id])}
                onClick={() => void onSubmit()}
              >
                {dictionary['challenges.submitQuiz']}
              </button>
            ) : null}

            {result ? (
              <div className="stack" data-testid="quiz-result">
                <p className="streak">
                  {dictionary['challenges.quizScore']}: {result.score.correct}/{result.score.total}
                </p>
                {result.items.map((item) => (
                  <p key={item.quizItemId} className="muted">
                    {item.isCorrect ? '✓' : '✗'} {item.teachBack}
                  </p>
                ))}
                <p className="muted">{dictionary['challenges.completed']}</p>
                <Link className="btn btn-secondary" href={`/${locale}/tutor`}>
                  {dictionary['nav.tutor']}
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        {quizMissing && attempt?.status === 'in_progress' ? (
          <div className="stack">
            <p className="muted">{dictionary['challenges.noQuiz']}</p>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onCompleteStub()}>
              {dictionary['challenges.complete']}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
