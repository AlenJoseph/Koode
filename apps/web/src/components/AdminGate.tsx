'use client';

import type { Locale, MessageKey, SessionUser } from '@koode/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminChallengesPanel } from '@/components/AdminChallengesPanel';
import { AdminPathwaysPanel } from '@/components/AdminPathwaysPanel';
import { fetchAdminMe } from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

type GateState =
  | { status: 'loading' }
  | { status: 'ok'; user: SessionUser }
  | { status: 'forbidden' }
  | { status: 'signedOut' };

export function AdminGate({ locale, dictionary }: Props) {
  const [state, setState] = useState<GateState>({ status: 'loading' });

  useEffect(() => {
    void fetchAdminMe()
      .then((result) => {
        if (result === null) {
          setState({ status: 'signedOut' });
          return;
        }
        if (result === 'forbidden') {
          setState({ status: 'forbidden' });
          return;
        }
        setState({ status: 'ok', user: result.user });
      })
      .catch(() => setState({ status: 'forbidden' }));
  }, []);

  if (state.status === 'loading') {
    return <p className="muted">{dictionary['health.ok']}…</p>;
  }

  if (state.status === 'signedOut') {
    return (
      <div className="panel stack">
        <h2>{dictionary['admin.title']}</h2>
        <p>{dictionary['admin.needSignIn']}</p>
        <Link className="button secondary" href={`/${locale}/sign-in`}>
          {dictionary['nav.signIn']}
        </Link>
      </div>
    );
  }

  if (state.status === 'forbidden') {
    return (
      <div className="panel stack">
        <h2>{dictionary['admin.title']}</h2>
        <p role="alert">{dictionary['admin.forbidden']}</p>
        <Link href={`/${locale}`}>{dictionary['nav.home']}</Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel stack">
        <h2>{dictionary['admin.title']}</h2>
        <p>
          {dictionary['admin.welcome']}{' '}
          <strong>{state.user.email ?? state.user.displayName ?? 'admin'}</strong>
        </p>
      </div>
      <AdminPathwaysPanel dictionary={dictionary} />
      <AdminChallengesPanel dictionary={dictionary} />
    </div>
  );
}
