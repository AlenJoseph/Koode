import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { PathwayDetailPanel } from '@/components/PathwayDetailPanel';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string; pathwayId: string }>;
};

export default async function PathwayDetailPage({ params }: Props) {
  const { locale: raw, pathwayId } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const dictionary = getDictionary(locale);
  return <PathwayDetailPanel locale={locale} dictionary={dictionary} pathwayId={pathwayId} />;
}
