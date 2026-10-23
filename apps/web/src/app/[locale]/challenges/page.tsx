import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { ChallengesBrowsePanel } from '@/components/ChallengesBrowsePanel';
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
  return <ChallengesBrowsePanel locale={locale} dictionary={getDictionary(locale)} />;
}
