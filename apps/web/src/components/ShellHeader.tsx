import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function ShellHeader({ locale, dictionary }: Props) {
  const otherLocale = locale === 'en' ? 'ml' : 'en';

  return (
    <header className="shell-header">
      <div>
        <p className="locales">
          <span>{dictionary['locale.switch']}</span>
          <Link href={`/${otherLocale}`}>{dictionary[`locale.${otherLocale}`]}</Link>
        </p>
        <h1 className="brand">{dictionary['app.name']}</h1>
        <p className="tagline">{dictionary['app.tagline']}</p>
      </div>
      <nav className="nav" aria-label="Primary">
        <Link href={`/${locale}`}>{dictionary['nav.home']}</Link>
        <Link href={`/${locale}/challenges`}>{dictionary['nav.challenges']}</Link>
        <Link href={`/${locale}/progress`}>{dictionary['nav.progress']}</Link>
        <Link className="button secondary" href={`/${locale}/sign-in`}>
          {dictionary['nav.signIn']}
        </Link>
      </nav>
    </header>
  );
}
