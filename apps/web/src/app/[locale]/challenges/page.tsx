import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ChallengesPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const dictionary = getDictionary(locale);
  return (
    <div className="panel">
      <h2>{dictionary['nav.challenges']}</h2>
      <p className="muted">{dictionary['health.ok']}</p>
    </div>
  );
}
