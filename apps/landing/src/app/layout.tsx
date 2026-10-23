import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_LANDING_ORIGIN ?? 'http://localhost:3002';
const appUrl = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Koode | Learn life skills. Keep the thinking.',
  description:
    'Open classroom and independent-learning app for life skill pathways: self, thinking, communication, health, money, civic life, nature, and making useful things. Teachers run classes with a join code.',
  openGraph: {
    title: 'Koode | Learn life skills. Keep the thinking.',
    description:
      'Pathways, challenges, projects, and a gentle tutor for students and teachers. Open source. Privacy first.',
    url: siteUrl,
    siteName: 'Koode',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Koode | Learn life skills. Keep the thinking.',
    description:
      'Life skill pathways for classrooms and independent learners. Open source learning software.',
  },
  alternates: {
    canonical: '/',
  },
  other: {
    'koode:app': appUrl,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
