import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { SignUpForm } from '@/components/SignUpForm';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SignUpPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  return <SignUpForm locale={locale} dictionary={getDictionary(locale)} />;
}
