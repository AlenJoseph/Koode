import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { ShopPanel } from '@/components/ShopPanel';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ShopPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const dictionary = getDictionary(locale);
  return <ShopPanel locale={locale} dictionary={dictionary} />;
}
