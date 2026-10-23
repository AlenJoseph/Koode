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
      <div>
        <Link className="wordmark" href={`/${locale}`}>
          {dictionary['app.name']}
        </Link>
        <p className="locales">
          <span>{dictionary['locale.switch']}</span>
          <Link href={`/${otherLocale}`}>{dictionary[`locale.${otherLocale}`]}</Link>
        </p>
      </div>
      <nav aria-label="Primary">
        <Link href={`/${locale}`}>{dictionary['nav.home']}</Link>
        <Link href={`/${locale}/pathways`}>{dictionary['nav.pathways']}</Link>
        <Link href={`/${locale}/challenges`}>{dictionary['nav.challenges']}</Link>
        <Link href={`/${locale}/tutor`}>{dictionary['nav.tutor']}</Link>
        <Link href={`/${locale}/progress`}>{dictionary['nav.progress']}</Link>
        <Link href={`/${locale}/classroom`}>{dictionary['nav.classroom']}</Link>
        <Link href={`/${locale}/insights`}>{dictionary['nav.insights']}</Link>
        <Link href={`/${locale}/join`}>{dictionary['nav.join']}</Link>
        <Link href={`/${locale}/sign-up`}>{dictionary['nav.signUp']}</Link>
        <Link className="btn btn-secondary" href={`/${locale}/sign-in`}>
          {dictionary['nav.signIn']}
        </Link>
      </nav>
    </header>
  );
}
