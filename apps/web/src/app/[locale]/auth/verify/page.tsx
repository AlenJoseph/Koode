import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { VerifyClient } from '@/components/VerifyClient';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyPage({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  const { token } = await searchParams;
  if (!isLocale(raw) || !token) {
    notFound();
  }
  const locale = raw as Locale;
  return <VerifyClient locale={locale} token={token} dictionary={getDictionary(locale)} />;
}
