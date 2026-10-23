import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { AdminGate } from '@/components/AdminGate';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  return <AdminGate locale={locale} dictionary={getDictionary(locale)} />;
}
