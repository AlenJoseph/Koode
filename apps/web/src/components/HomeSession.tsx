'use client';

import type { Locale, MessageKey, SessionUser } from '@koode/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ClaimEmailForm } from '@/components/ClaimEmailForm';
import { fetchMe, logout } from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function HomeSession({ locale, dictionary }: Props) {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    void fetchMe()
      .then((result) => setUser(result?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  async function onSignOut() {
    await logout();
    setUser(null);
  }

  if (user === undefined) {
    return <p className="muted">{dictionary['health.ok']}…</p>;
  }

  if (!user) {
    return (
      <div className="panel stack">
        <p>{dictionary['home.signedOutHint']}</p>
        <div className="nav">
          <Link className="button" href={`/${locale}/sign-up`}>
            {dictionary['nav.signUp']}
          </Link>
          <Link className="button secondary" href={`/${locale}/sign-in`}>
            {dictionary['nav.signIn']}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel stack">
        <p>
          {dictionary['auth.signedInAs']}{' '}
          <strong>{user.displayName ?? user.email ?? user.role}</strong>
          {user.email && user.displayName ? (
            <span className="muted"> ({user.email})</span>
          ) : null}
        </p>
        <p>{dictionary['home.welcome']}</p>
        <button type="button" className="secondary" onClick={() => void onSignOut()}>
          {dictionary['nav.signOut']}
        </button>
      </div>
      {!user.email ? <ClaimEmailForm locale={locale} dictionary={dictionary} /> : null}
    </div>
  );
}
