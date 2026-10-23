'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { bootstrapAdmin, getBootstrapStatus } from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function AdminBootstrapForm({ locale, dictionary }: Props) {
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [pending, setPending] = useState(false);
  const [bootstrapped, setBootstrapped] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);

  useEffect(() => {
    void getBootstrapStatus()
      .then((status) => {
        setBootstrapped(status.bootstrapped);
        setEnabled(status.bootstrapEnabled);
      })
      .catch(() => setEnabled(false));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrorKey(null);
    try {
      const result = await bootstrapAdmin(email, secret);
      setBootstrapped(true);
      if (result.devVerifyUrl) {
        const url = new URL(result.devVerifyUrl);
        setDevVerifyUrl(`/${locale}/auth/verify?token=${url.searchParams.get('token')}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('409')) {
        setErrorKey('admin.bootstrapAlready');
        setBootstrapped(true);
      } else if (message.includes('503')) {
        setErrorKey('admin.bootstrapDisabled');
      } else {
        setErrorKey('admin.bootstrapError');
      }
    } finally {
      setPending(false);
    }
  }

  if (bootstrapped === null) {
    return <p className="muted">{dictionary['health.ok']}…</p>;
  }

  if (!enabled) {
    return (
      <div className="panel stack">
        <h2>{dictionary['admin.bootstrapTitle']}</h2>
        <p>{dictionary['admin.bootstrapDisabled']}</p>
      </div>
    );
  }

  if (bootstrapped && !devVerifyUrl) {
    return (
      <div className="panel stack">
        <h2>{dictionary['admin.bootstrapTitle']}</h2>
        <p>{dictionary['admin.bootstrapAlready']}</p>
      </div>
    );
  }

  return (
    <div className="panel stack">
      <h2>{dictionary['admin.bootstrapTitle']}</h2>
      <p className="muted">{dictionary['admin.bootstrapHint']}</p>
      {!devVerifyUrl ? (
        <form className="stack" onSubmit={(event) => void onSubmit(event)}>
          <label htmlFor="admin-email">{dictionary['auth.emailLabel']}</label>
          <input
            id="admin-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="admin-secret">{dictionary['admin.bootstrapSecret']}</label>
          <input
            id="admin-secret"
            type="password"
            required
            minLength={16}
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
          />
          <button type="submit" disabled={pending}>
            {dictionary['admin.bootstrapSubmit']}
          </button>
        </form>
      ) : (
        <div className="stack">
          <p>{dictionary['admin.bootstrapDone']}</p>
          <Link className="dev-link" href={devVerifyUrl}>
            {devVerifyUrl}
          </Link>
        </div>
      )}
      {errorKey ? <p className="muted">{dictionary[errorKey]}</p> : null}
    </div>
  );
}
