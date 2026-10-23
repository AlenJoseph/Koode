import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { TutorPanel } from '@/components/TutorPanel';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TutorPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  return <TutorPanel locale={locale} dictionary={getDictionary(locale)} />;
}
