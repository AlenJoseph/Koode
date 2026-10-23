'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { requestMagicLink } from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function SignInForm({ locale, dictionary }: Props) {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await requestMagicLink(email);
      if (result.devVerifyUrl) {
        const url = new URL(result.devVerifyUrl);
        setDevVerifyUrl(`/${locale}/auth/verify?token=${url.searchParams.get('token')}`);
      } else {
        setDevVerifyUrl(null);
      }
    } catch {
      setError('request_failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      <section className="hero-strip">
        <div className="blob b" aria-hidden="true" />
        <h1 className="brand-hero" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
          {dictionary['auth.title']}
        </h1>
        <p className="support">
          {dictionary['auth.teacherHint']}{' '}
          <Link href={`/${locale}/join`}>{dictionary['nav.join']}</Link>
        </p>
      </section>
      <div className="panel stack">
        <form className="stack" onSubmit={onSubmit}>
          <div>
            <label htmlFor="email">{dictionary['auth.emailLabel']}</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {dictionary['auth.sendLink']}
          </button>
        </form>
        {devVerifyUrl ? (
          <div className="stack">
            <p>{dictionary['auth.linkSent']}</p>
            <Link className="dev-link" href={devVerifyUrl}>
              {devVerifyUrl}
            </Link>
          </div>
        ) : null}
        {error ? <p className="muted">{dictionary['auth.verifyFailed']}</p> : null}
      </div>
    </div>
  );
}
