import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { HomeSession } from '@/components/HomeSession';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const dictionary = getDictionary(locale);

  return <HomeSession locale={locale} dictionary={dictionary} />;
}
