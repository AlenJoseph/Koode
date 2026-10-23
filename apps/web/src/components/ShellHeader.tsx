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

      <nav className="topbar-nav" aria-label="Primary">
        <Link href={`/${locale}/pathways`}>{dictionary['nav.pathways']}</Link>
        <Link href={`/${locale}/challenges`}>{dictionary['nav.challenges']}</Link>
        <Link href={`/${locale}/tutor`}>{dictionary['nav.tutor']}</Link>
        <Link href={`/${locale}/progress`}>{dictionary['nav.progress']}</Link>
        <Link className="nav-quiet" href={`/${locale}/classroom`}>
          {dictionary['nav.classroom']}
        </Link>
        <Link className="nav-quiet" href={`/${locale}/insights`}>
          {dictionary['nav.insights']}
        </Link>
      </nav>

      <div className="topbar-actions">
        {!user ? (
          <>
            <Link className="nav-quiet" href={`/${locale}/join`}>
              {dictionary['nav.join']}
            </Link>
            <Link className="btn btn-primary btn-sm" href={`/${locale}/sign-up`}>
              {dictionary['nav.signUp']}
            </Link>
            <Link className="btn btn-secondary btn-sm" href={`/${locale}/sign-in`}>
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
