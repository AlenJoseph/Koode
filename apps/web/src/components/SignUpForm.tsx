'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { requestMagicLink } from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function SignUpForm({ locale, dictionary }: Props) {
  const [email, setEmail] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ageConfirmed) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await requestMagicLink(email, 'learner');
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
    <div className="panel stack">
      <h2>{dictionary['auth.signUpTitle']}</h2>
      <p className="muted">
        {dictionary['auth.learnerHint']}{' '}
        <Link href={`/${locale}/sign-in`}>{dictionary['nav.signIn']}</Link>
      </p>
      <p data-testid="age-gate">{dictionary['auth.ageGate']}</p>
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
        <label htmlFor="age-confirm">
          <input
            id="age-confirm"
            name="ageConfirm"
            type="checkbox"
            required
            checked={ageConfirmed}
            onChange={(event) => setAgeConfirmed(event.target.checked)}
          />{' '}
          {dictionary['auth.ageConfirm']}
        </label>
        <button type="submit" disabled={pending || !ageConfirmed}>
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
  );
}
