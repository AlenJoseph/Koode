'use client';

import type { Locale, MessageKey, SessionUser } from '@koode/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchMe, logout } from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function ShellHeader({ locale, dictionary }: Props) {
  const otherLocale = locale === 'en' ? 'ml' : 'en';
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    void fetchMe()
      .then((result) => setUser(result?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  async function onSignOut() {
    await logout();
    setUser(null);
    window.location.href = `/${locale}`;
  }

  const role = user?.role;
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';
  const isLearnerSide = role === 'learner' || role === 'student';
  const sessionPending = user === undefined;

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <Link className="wordmark" href={`/${locale}`}>
          {dictionary['app.name']}
        </Link>
        <Link className="locale-pill" href={`/${otherLocale}`} hrefLang={otherLocale}>
          {locale.toUpperCase()}
          <span aria-hidden="true">·</span>
          {otherLocale.toUpperCase()}
        </Link>
      </div>

      <nav className="topbar-nav" aria-label="Primary" aria-busy={sessionPending || undefined}>
        {sessionPending ? (
          <span className="nav-quiet">{dictionary['health.ok']}…</span>
        ) : null}
        {!sessionPending && (!user || isLearnerSide) ? (
          <>
            <Link href={`/${locale}/pathways`}>{dictionary['nav.pathways']}</Link>
            <Link href={`/${locale}/challenges`}>{dictionary['nav.challenges']}</Link>
            <Link href={`/${locale}/tutor`}>{dictionary['nav.tutor']}</Link>
            <Link href={`/${locale}/progress`}>{dictionary['nav.progress']}</Link>
          </>
        ) : null}
        {!sessionPending && isTeacher ? (
          <>
            <Link href={`/${locale}/classroom`}>{dictionary['nav.classroom']}</Link>
            <Link href={`/${locale}/insights`}>{dictionary['nav.insights']}</Link>
            <Link className="nav-quiet" href={`/${locale}/pathways`}>
              {dictionary['nav.pathways']}
            </Link>
          </>
        ) : null}
        {!sessionPending && isAdmin ? (
          <Link href={`/${locale}/admin`}>{dictionary['nav.admin']}</Link>
        ) : null}
        {!sessionPending && !user ? (
          <Link className="nav-quiet" href={`/${locale}/join`}>
            {dictionary['nav.join']}
          </Link>
        ) : null}
      </nav>

      <div className="topbar-actions">
        {sessionPending ? null : !user ? (
          <>
            <Link className="btn btn-primary btn-sm" href={`/${locale}/sign-up`}>
              {dictionary['nav.signUp']}
            </Link>
            <Link className="nav-quiet teacher-only-link" href={`/${locale}/sign-in`}>
              {dictionary['nav.signIn']}
            </Link>
          </>
        ) : (
          <>
            <span className="topbar-user" title={user.email ?? user.role}>
              {user.displayName ?? user.email ?? user.role}
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void onSignOut()}>
              {dictionary['nav.signOut']}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
