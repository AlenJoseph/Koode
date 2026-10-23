'use client';

import type { Locale, MessageKey, TutorTurnResponse } from '@koode/contracts';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { fetchMe, runTutorTurn } from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function TutorPanel({ locale, dictionary }: Props) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [topic, setTopic] = useState(locale === 'ml' ? 'പ്രാദേശിക മഴ' : 'local rainfall');
  const [message, setMessage] = useState(
    locale === 'ml' ? 'ഞാൻ മഴ മനസ്സിലാക്കാൻ ആഗ്രഹിക്കുന്നു' : 'I want to understand rainfall near me',
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [turn, setTurn] = useState<TutorTurnResponse | null>(null);
  const [adapter, setAdapter] = useState<string | null>(null);

  useEffect(() => {
    void fetchMe()
      .then((result) => setSignedIn(Boolean(result?.user)))
      .catch(() => setSignedIn(false));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(false);
    try {
      const result = await runTutorTurn({
        locale,
        topic,
        learnerMessage: message,
        phase: 'explain',
      });
      setTurn(result.turn);
      setAdapter(result.adapter);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  if (signedIn === null) {
    return <p className="muted">{dictionary['health.ok']}…</p>;
  }

  if (!signedIn) {
    return (
      <div className="panel stack">
        <h2>{dictionary['tutor.title']}</h2>
        <p>{dictionary['tutor.needSignIn']}</p>
        <Link className="button" href={`/${locale}/sign-in`}>
          {dictionary['nav.signIn']}
        </Link>
      </div>
    );
  }

  return (
    <div className="panel stack">
      <h2>{dictionary['tutor.title']}</h2>
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        <div>
          <label htmlFor="topic">{dictionary['tutor.topicLabel']}</label>
          <input
            id="topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="message">{dictionary['tutor.messageLabel']}</label>
          <textarea
            id="message"
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={pending}>
          {dictionary['tutor.send']}
        </button>
      </form>
      {error ? <p className="muted">{dictionary['tutor.error']}</p> : null}
      {turn ? (
        <div className="stack">
          {adapter ? <p className="muted">adapter: {adapter}</p> : null}
          <p>{turn.reply}</p>
          {turn.guidingQuestion ? (
            <p>
              <strong>{dictionary['tutor.guidingQuestion']}:</strong> {turn.guidingQuestion}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
