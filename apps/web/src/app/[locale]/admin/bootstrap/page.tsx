import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { AdminBootstrapForm } from '@/components/AdminBootstrapForm';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminBootstrapPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  return <AdminBootstrapForm locale={locale} dictionary={getDictionary(locale)} />;
}
