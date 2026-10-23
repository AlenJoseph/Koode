'use client';

import type { Locale, MessageKey, SessionUser } from '@koode/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ClaimEmailForm } from '@/components/ClaimEmailForm';
import { fetchMe } from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

function isTeacherRole(role: string | undefined): boolean {
  return role === 'teacher' || role === 'admin';
}

export function HomeSession({ locale, dictionary }: Props) {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    void fetchMe()
      .then((result) => setUser(result?.user ?? null))
      .catch(() => setUser(null));
  }, []);

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
        <div className="ctas">
          <Link className="btn btn-primary" href={`/${locale}/sign-up`}>
            {dictionary['nav.signUp']}
          </Link>
          <Link className="btn btn-accent" href={`/${locale}/join`}>
            {dictionary['nav.join']}
          </Link>
        </div>
        <p className="teacher-gate">
          <Link href={`/${locale}/sign-in`}>{dictionary['nav.signIn']}</Link>
          <span className="muted"> — for teachers only</span>
        </p>
      </section>
    );
  }

  const teacher = isTeacherRole(user.role);

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
        <div className="ctas">
          {teacher ? (
            <>
              <Link className="btn btn-primary" href={`/${locale}/classroom`}>
                {dictionary['nav.classroom']}
              </Link>
              <Link className="btn btn-secondary" href={`/${locale}/insights`}>
                {dictionary['nav.insights']}
              </Link>
            </>
          ) : (
            <>
              <Link className="btn btn-primary" href={`/${locale}/pathways`}>
                {dictionary['nav.pathways']}
              </Link>
              <Link className="btn btn-secondary" href={`/${locale}/challenges`}>
                {dictionary['nav.challenges']}
              </Link>
              <Link className="btn btn-accent" href={`/${locale}/tutor`}>
                {dictionary['nav.tutor']}
              </Link>
            </>
          )}
        </div>
      </section>
      {!user.email && !teacher ? <ClaimEmailForm locale={locale} dictionary={dictionary} /> : null}
    </div>
  );
}
