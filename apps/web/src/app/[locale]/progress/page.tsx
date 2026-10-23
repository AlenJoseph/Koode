import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { ProgressOverview } from '@/components/ProgressOverview';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProgressPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  return <ProgressOverview locale={locale} dictionary={getDictionary(locale)} />;
}
