import { isLocale, type Locale } from '@koode/contracts';
import { notFound } from 'next/navigation';
import { SignInForm } from '@/components/SignInForm';
import { getDictionary } from '@/i18n/dictionaries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SignInPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  return <SignInForm locale={locale} dictionary={getDictionary(locale)} />;
}
