import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { PathwaysBrowsePanel } from '@/components/PathwaysBrowsePanel';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PathwaysPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  return <PathwaysBrowsePanel locale={locale} dictionary={getDictionary(locale)} />;
}
