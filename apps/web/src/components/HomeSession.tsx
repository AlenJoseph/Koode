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
      <section className="hero-strip" aria-label="Welcome">
        <div className="blob a" aria-hidden="true" />
        <div className="blob b" aria-hidden="true" />
        <p className="brand-hero">{dictionary['app.name']}</p>
        <h1 className="headline">{dictionary['app.tagline']}</h1>
        <p className="support">{dictionary['home.signedOutHint']}</p>
        <div className="ctas" style={{ marginTop: '1.25rem' }}>
          <Link className="btn btn-primary" href={`/${locale}/sign-up`}>
            {dictionary['nav.signUp']}
          </Link>
          <Link className="btn btn-secondary" href={`/${locale}/sign-in`}>
            {dictionary['nav.signIn']}
          </Link>
          <Link className="btn btn-accent" href={`/${locale}/join`}>
            {dictionary['nav.join']}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="hero-strip" aria-label="Home">
        <div className="blob a" aria-hidden="true" />
        <div className="blob b" aria-hidden="true" />
        <p className="brand-hero">{dictionary['app.name']}</p>
        <h1 className="headline">{dictionary['home.welcome']}</h1>
        <p className="support">
          {dictionary['auth.signedInAs']}{' '}
          <strong>{user.displayName ?? user.email ?? user.role}</strong>
        </p>
        <div className="ctas" style={{ marginTop: '1.25rem' }}>
          <Link className="btn btn-primary" href={`/${locale}/pathways`}>
            {dictionary['nav.pathways']}
          </Link>
          <Link className="btn btn-secondary" href={`/${locale}/challenges`}>
            {dictionary['nav.challenges']}
          </Link>
          <Link className="btn btn-accent" href={`/${locale}/tutor`}>
            {dictionary['nav.tutor']}
          </Link>
          <button type="button" className="btn-ghost" onClick={() => void onSignOut()}>
            {dictionary['nav.signOut']}
          </button>
        </div>
      </section>
      {!user.email ? <ClaimEmailForm locale={locale} dictionary={dictionary} /> : null}
    </div>
  );
}
