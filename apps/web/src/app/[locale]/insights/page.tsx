import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { InsightsPanel } from '@/components/InsightsPanel';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function InsightsPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  return <InsightsPanel locale={locale} dictionary={getDictionary(locale)} />;
}
