'use client';

import type { Locale, MessageKey, TutorTurnResponse } from '@koode/contracts';
import { useEffect, useState } from 'react';
import {
  fetchRecentLearningEvents,
  runTutorTurn,
} from '@/lib/api';
import { emitLearningEvent } from '@/lib/learning-events';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
  open: boolean;
  onClose: () => void;
  pathwaySlug?: string | null;
  contentSlug?: string | null;
  challengeId?: string | null;
  stepId?: string | null;
  topic: string;
};

export function CopilotPopup({
  locale,
  dictionary,
  open,
  onClose,
  pathwaySlug,
  contentSlug,
  challengeId,
  stepId,
  topic,
}: Props) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [turn, setTurn] = useState<TutorTurnResponse | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTurn(null);
    setMessage('');
    setError(false);
  }, [open, stepId]);

  if (!open) {
    return null;
  }

  async function onSend() {
    if (!message.trim()) {
      return;
    }
    setBusy(true);
    setError(false);
    try {
      const { events } = await fetchRecentLearningEvents({
        contentId: contentSlug ?? undefined,
        stepId: stepId ?? undefined,
        limit: 12,
      });
      // Never send chosen options / correctness keys into the model prompt.
      const facts = events
        .map((e) => {
          const safe: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(e.payload ?? {})) {
            if (
              k === 'chosen' ||
              k === 'selectedOptionId' ||
              k === 'correctOptionId' ||
              k === 'correct' ||
              k === 'question_text'
            ) {
              continue;
            }
            safe[k] = v;
          }
          return `${e.eventType}@${e.stepId ?? '-'}:${JSON.stringify(safe)}`;
        })
        .join('\n')
        .slice(0, 3500);

      await emitLearningEvent({
        eventType: 'COPILOT_QUESTION_ASKED',
        pathwayId: pathwaySlug,
        contentId: contentSlug,
        stepId,
        payload: { question_text: message.trim() },
      });

      const result = await runTutorTurn({
        locale,
        topic,
        learnerMessage: message.trim(),
        phase: 'guiding_question',
        contentPathwayId: pathwaySlug ?? null,
        contentChallengeId: contentSlug ?? null,
        challengeId: challengeId ?? null,
        stepId: stepId ?? null,
        recentLearningFacts: facts || undefined,
      });
      setTurn(result.turn);
      setMessage('');
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="copilot-backdrop" role="presentation" data-testid="copilot-popup">
      <div className="copilot-panel" role="dialog" aria-label={dictionary['challenges.needHelp']}>
        <header className="copilot-header">
          <h2>{dictionary['challenges.needHelp']}</h2>
          <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>
        <p className="muted">
          Copilot asks guiding questions. It will not give quiz answers.
        </p>
        {turn ? (
          <div className="copilot-reply" data-testid="copilot-reply">
            <p>{turn.reply}</p>
            {turn.guidingQuestion ? (
              <p>
                <strong>{dictionary['tutor.guidingQuestion']}:</strong> {turn.guidingQuestion}
              </p>
            ) : null}
          </div>
        ) : null}
        <label className="field">
          <span>{dictionary['tutor.messageLabel']}</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            data-testid="copilot-message"
          />
        </label>
        {error ? <p className="error">{dictionary['tutor.error']}</p> : null}
        <div className="copilot-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !message.trim()}
            onClick={() => void onSend()}
            data-testid="copilot-send"
          >
            {dictionary['tutor.send']}
          </button>
        </div>
      </div>
    </div>
  );
}
