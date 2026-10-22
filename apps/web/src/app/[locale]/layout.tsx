import { isLocale, type Locale } from '@koode/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { ShellHeader } from '@/components/ShellHeader';
import { getDictionary } from '@/i18n/dictionaries';
import '../globals.css';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ml' }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    return {};
  }
  const dictionary = getDictionary(raw);
  return {
    title: dictionary['app.name'],
    description: dictionary['app.tagline'],
    manifest: '/manifest.webmanifest',
    icons: { icon: '/icon.svg' },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const dictionary = getDictionary(locale);

  return (
    <html lang={locale}>
      <body>
        <ServiceWorkerRegister />
        <main>
          <ShellHeader locale={locale} dictionary={dictionary} />
          {children}
        </main>
      </body>
    </html>
  );
}
