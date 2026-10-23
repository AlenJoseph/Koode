'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { requestClaimEmail } from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function ClaimEmailForm({ locale, dictionary }: Props) {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(false);
    try {
      const result = await requestClaimEmail(email);
      if (result.devVerifyUrl) {
        const url = new URL(result.devVerifyUrl);
        setDevVerifyUrl(`/${locale}/auth/verify?token=${url.searchParams.get('token')}`);
      }
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="panel stack">
      <h3>{dictionary['auth.claimTitle']}</h3>
      <p className="muted">{dictionary['auth.claimHint']}</p>
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        <label htmlFor="claim-email">{dictionary['auth.emailLabel']}</label>
        <input
          id="claim-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button type="submit" disabled={pending}>
          {dictionary['auth.claimSend']}
        </button>
      </form>
      {devVerifyUrl ? (
        <Link className="dev-link" href={devVerifyUrl}>
          {devVerifyUrl}
        </Link>
      ) : null}
      {error ? <p className="muted">{dictionary['auth.verifyFailed']}</p> : null}
    </div>
  );
}
