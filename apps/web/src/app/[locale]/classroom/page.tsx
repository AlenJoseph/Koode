import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { ClassroomPanel } from '@/components/ClassroomPanel';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ClassroomPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  return <ClassroomPanel locale={locale} dictionary={getDictionary(locale)} />;
}
