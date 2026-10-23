'use client';

import type { AutoHelpNudge, Locale, MessageKey } from '@koode/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  completeChallengeAttempt,
  fetchChallengeLesson,
  fetchLearningConfig,
  saveLessonProgress,
  startChallengeAttempt,
  submitChallengeQuiz,
  type ChallengeAttempt,
  type LearnerLesson,
  type QuizSubmitResult,
} from '@/lib/api';
import { emitLearningEvent, shouldEmitProgress } from '@/lib/learning-events';
import { CopilotPopup } from '@/components/CopilotPopup';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
  challengeId: string;
  onExitLesson?: () => void;
};

export function LessonPlayer({ locale, dictionary, challengeId }: Props) {
  const [lesson, setLesson] = useState<LearnerLesson | null>(null);
  const [attempt, setAttempt] = useState<ChallengeAttempt | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<QuizSubmitResult | null>(null);
  const [nudge, setNudge] = useState<AutoHelpNudge | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [idleMs, setIdleMs] = useState(15_000);
  const [hintShown, setHintShown] = useState(false);
  const step = lesson?.steps[stepIndex] ?? null;

  const load = useCallback(async () => {
    const [loaded, cfg] = await Promise.all([
      fetchChallengeLesson(challengeId),
      fetchLearningConfig().catch(() => null),
    ]);
    if (cfg?.autoHelpIdleMs) {
      setIdleMs(cfg.autoHelpIdleMs);
    }
    if (!loaded) {
      setLesson(null);
      return;
    }
    setLesson(loaded.lesson);
    const progress = loaded.lesson.progress;
    if (progress) {
      setCompleted(progress.completedStepIds);
      const idx = loaded.lesson.steps.findIndex((s) => s.id === progress.currentStepId);
      setStepIndex(idx >= 0 ? idx : 0);
    }
  }, [challengeId]);

  useEffect(() => {
    void load().catch(() => setError(true));
  }, [load]);

  useEffect(() => {
    if (!nudge || !lesson || !step) {
      return;
    }
    void emitLearningEvent({
      eventType: 'AUTO_HELP_NUDGE_SHOWN',
      pathwayId: lesson.pathwaySlug,
      contentId: lesson.slug,
      stepId: step.id,
      payload: { reason: nudge.reason },
    });
  }, [nudge, lesson, step]);

  useEffect(() => {
    if (!lesson || !step) {
      return;
    }
    setHintShown(false);
    setQuizResult(null);
    const pathwayId = lesson.pathwaySlug;
    const contentId = lesson.slug;
    const stepId = step.id;
    void emitLearningEvent({
      eventType: 'STEP_ENTERED',
      pathwayId,
      contentId,
      stepId,
    });
    if (step.kind === 'slide') {
      void emitLearningEvent({
        eventType: 'SLIDE_OPENED',
        pathwayId,
        contentId,
        stepId,
      });
    }
    const t = setTimeout(() => {
      void emitLearningEvent({
        eventType: 'STEP_IDLE',
        pathwayId,
        contentId,
        stepId,
      }).then((res) => {
        if (res.nudge) {
          setNudge(res.nudge);
        }
      });
    }, idleMs);
    return () => clearTimeout(t);
  }, [lesson, step, idleMs]);

  const quizItems = useMemo(() => {
    if (!lesson || !step?.quizItemIds?.length) {
      return [];
    }
    return (lesson.quiz ?? []).filter((q) => step.quizItemIds!.includes(q.id));
  }, [lesson, step]);

  async function ensureAttempt() {
    if (attempt) {
      return attempt;
    }
    const { attempt: started } = await startChallengeAttempt(challengeId);
    setAttempt(started);
    await emitLearningEvent({
      eventType: 'CHALLENGE_STARTED',
      pathwayId: lesson?.pathwaySlug,
      contentId: lesson?.slug,
    });
    return started;
  }

  async function persistProgress(nextIndex: number, nextCompleted: string[]) {
    if (!lesson) {
      return;
    }
    const currentStepId = lesson.steps[nextIndex]?.id ?? lesson.steps[0]!.id;
    await saveLessonProgress(challengeId, {
      currentStepId,
      completedStepIds: nextCompleted,
    });
  }

  async function markStepDoneAndAdvance() {
    if (!lesson || !step) {
      return;
    }
    setBusy(true);
    setError(false);
    try {
      const nextCompleted = completed.includes(step.id) ? completed : [...completed, step.id];
      setCompleted(nextCompleted);
      await emitLearningEvent({
        eventType: 'STEP_COMPLETED',
        pathwayId: lesson.pathwaySlug,
        contentId: lesson.slug,
        stepId: step.id,
      });
      const nextIndex = Math.min(stepIndex + 1, lesson.steps.length - 1);
      setStepIndex(nextIndex);
      await persistProgress(nextIndex, nextCompleted);

      if (nextCompleted.length >= lesson.steps.length) {
        const liveAttempt = await ensureAttempt();
        if (liveAttempt.status !== 'completed') {
          await completeChallengeAttempt(liveAttempt.id);
        }
        await emitLearningEvent({
          eventType: 'CHALLENGE_COMPLETED',
          pathwayId: lesson.pathwaySlug,
          contentId: lesson.slug,
        });
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitQuiz() {
    if (!lesson || !step || quizItems.length === 0) {
      return;
    }
    setBusy(true);
    setError(false);
    try {
      const liveAttempt = await ensureAttempt();
      for (const item of quizItems) {
        const optionId = answers[item.id];
        if (!optionId) {
          setError(true);
          setBusy(false);
          return;
        }
      }
      const result = await submitChallengeQuiz(
        liveAttempt.id,
        quizItems.map((item) => ({ quizItemId: item.id, optionId: answers[item.id]! })),
        { stepId: step.id },
      );
      setQuizResult(result);
      setAttempt(result.attempt);
      if (result.nudge) {
        setNudge(result.nudge);
      }

      if (result.passed || result.score.correct === result.score.total) {
        await markStepDoneAndAdvance();
      }
      // Failed attempts stay in_progress — learner can change answers and resubmit.
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function onFlagConfusing() {
    if (!lesson || !step) {
      return;
    }
    const res = await emitLearningEvent({
      eventType: 'CONCEPT_FLAGGED_CONFUSING',
      pathwayId: lesson.pathwaySlug,
      contentId: lesson.slug,
      stepId: step.id,
      payload: { concept_id: step.conceptId ?? step.id },
    });
    if (res.nudge) {
      setNudge(res.nudge);
    }
    setCopilotOpen(true);
  }

  async function onRequestHint() {
    if (!lesson || !step) {
      return;
    }
    setHintShown(true);
    await emitLearningEvent({
      eventType: 'QUIZ_HINT_REQUESTED',
      pathwayId: lesson.pathwaySlug,
      contentId: lesson.slug,
      stepId: step.id,
      payload: { concept_id: step.conceptId ?? step.id },
    });
  }

  if (!lesson) {
    return error ? <p className="error">{dictionary['challenges.error']}</p> : <p>…</p>;
  }

  if (!step) {
    return <p className="error">{dictionary['challenges.error']}</p>;
  }

  const allDone = completed.length >= lesson.steps.length;

  return (
    <section className="lesson-player" data-testid="lesson-player">
      <header>
        <h1>{lesson.title}</h1>
        <p className="muted">{lesson.summary}</p>
        <p className="muted">
          Step {stepIndex + 1} / {lesson.steps.length}: {step.title}
        </p>
      </header>

      {nudge ? (
        <div className="auto-help-nudge" data-testid="auto-help-nudge" role="status">
          <p>{nudge.message || dictionary['challenges.autoHelpNudge']}</p>
            <button
            type="button"
            className="btn btn-primary btn-sm"
            data-testid="open-copilot-from-nudge"
            onClick={() => setCopilotOpen(true)}
          >
            {dictionary['challenges.needHelp']}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              void emitLearningEvent({
                eventType: 'AUTO_HELP_NUDGE_DISMISSED',
                pathwayId: lesson.pathwaySlug,
                contentId: lesson.slug,
                stepId: step.id,
              });
              setNudge(null);
            }}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="lesson-step" data-testid={`lesson-step-${step.id}`}>
        {step.bodyMarkdown ? (
          <div className="prose" data-testid="step-body">
            {step.bodyMarkdown.split('\n').map((line, i) => (
              <p key={i}>{line.replace(/^#+\s*/, '')}</p>
            ))}
          </div>
        ) : null}

        {step.kind === 'video' && step.mediaUrl ? (
          <video
            data-testid="lesson-video"
            src={step.mediaUrl}
            controls
            onPlay={() => {
              void emitLearningEvent({
                eventType: 'VIDEO_STARTED',
                pathwayId: lesson.pathwaySlug,
                contentId: lesson.slug,
                stepId: step.id,
              });
            }}
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              if (!shouldEmitProgress(`video:${step.id}`)) {
                return;
              }
              void emitLearningEvent({
                eventType: 'VIDEO_PROGRESS',
                pathwayId: lesson.pathwaySlug,
                contentId: lesson.slug,
                stepId: step.id,
                payload: { position_seconds: Math.floor(el.currentTime) },
              });
            }}
            onSeeked={(e) => {
              void emitLearningEvent({
                eventType: 'VIDEO_SEEKED',
                pathwayId: lesson.pathwaySlug,
                contentId: lesson.slug,
                stepId: step.id,
                payload: { to_seconds: Math.floor(e.currentTarget.currentTime) },
              }).then((res) => {
                if (res.nudge) setNudge(res.nudge);
              });
            }}
            onEnded={() => {
              void emitLearningEvent({
                eventType: 'VIDEO_COMPLETED',
                pathwayId: lesson.pathwaySlug,
                contentId: lesson.slug,
                stepId: step.id,
              });
            }}
          />
        ) : null}

        {step.kind === 'quiz' || step.kind === 'practice' ? (
          <form
            className="challenge-quiz"
            data-testid="challenge-quiz"
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmitQuiz();
            }}
          >
            {quizItems.map((item) => (
              <fieldset key={item.id}>
                <legend>{item.prompt}</legend>
                {item.options.map((opt) => (
                  <label key={opt.id}>
                    <input
                      type="radio"
                      name={item.id}
                      value={opt.id}
                      checked={answers[item.id] === opt.id}
                      onChange={() => setAnswers((prev) => ({ ...prev, [item.id]: opt.id }))}
                    />
                    {opt.label}
                  </label>
                ))}
              </fieldset>
            ))}
            <div className="lesson-actions">
              <button
                type="button"
                className="btn"
                data-testid="quiz-hint"
                disabled={hintShown || busy}
                onClick={() => void onRequestHint()}
              >
                Hint
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {dictionary['challenges.submitQuiz']}
              </button>
            </div>
            {hintShown ? (
              <p className="muted" data-testid="quiz-hint-text">
                A pause is space to choose — not silence forever. Pick the option that buys you that
                space.
              </p>
            ) : null}
          </form>
        ) : null}

        {quizResult ? (
          <div data-testid="quiz-result">
            <p>
              {dictionary['challenges.quizScore']}: {quizResult.score.correct}/
              {quizResult.score.total}
            </p>
            {quizResult.coins?.awarded ? (
              <p data-testid="coins-awarded">+{lesson.coinReward} Koode coins</p>
            ) : null}
          </div>
        ) : null}

        {step.kind === 'slide' || step.kind === 'reflection' || step.kind === 'field' || step.kind === 'video' ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            data-testid="lesson-next"
            onClick={() => void markStepDoneAndAdvance()}
          >
            {dictionary['challenges.nextStep']}
          </button>
        ) : null}
      </div>

      <div className="lesson-actions">
        <button
          type="button"
          className="btn"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
        >
          {dictionary['challenges.prevStep']}
        </button>
        <button
          type="button"
          className="btn"
          data-testid="need-help"
          onClick={() => setCopilotOpen(true)}
        >
          {dictionary['challenges.needHelp']}
        </button>
        <button type="button" className="btn" data-testid="flag-confusing" onClick={() => void onFlagConfusing()}>
          {dictionary['challenges.flagConfusing']}
        </button>
      </div>

      {allDone ? (
        <p data-testid="lesson-complete">{dictionary['challenges.lessonComplete']}</p>
      ) : null}
      {error ? <p className="error">{dictionary['challenges.error']}</p> : null}

      <CopilotPopup
        locale={locale}
        dictionary={dictionary}
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        pathwaySlug={lesson.pathwaySlug}
        contentSlug={lesson.slug}
        challengeId={challengeId}
        stepId={step.id}
        topic={lesson.title}
      />
    </section>
  );
}
