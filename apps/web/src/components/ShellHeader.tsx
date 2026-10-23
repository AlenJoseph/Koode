import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function ShellHeader({ locale, dictionary }: Props) {
  const otherLocale = locale === 'en' ? 'ml' : 'en';

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
        <Link className="nav-quiet" href={`/${locale}/join`}>
          {dictionary['nav.join']}
        </Link>
        <Link className="btn btn-primary btn-sm" href={`/${locale}/sign-up`}>
          {dictionary['nav.signUp']}
        </Link>
        <Link className="btn btn-secondary btn-sm" href={`/${locale}/sign-in`}>
          {dictionary['nav.signIn']}
        </Link>
      </div>
    </header>
  );
}
