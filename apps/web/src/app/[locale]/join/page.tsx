import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { JoinClassPanel } from '@/components/JoinClassPanel';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function JoinPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  return <JoinClassPanel locale={locale} dictionary={getDictionary(locale)} />;
}
