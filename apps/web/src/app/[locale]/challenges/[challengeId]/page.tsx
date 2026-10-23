import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { ChallengePlayPanel } from '@/components/ChallengePlayPanel';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string; challengeId: string }>;
};

export default async function ChallengeDetailPage({ params }: Props) {
  const { locale: raw, challengeId } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const dictionary = getDictionary(locale);
  return <ChallengePlayPanel locale={locale} dictionary={dictionary} challengeId={challengeId} />;
}
