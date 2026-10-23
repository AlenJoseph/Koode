import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_LANDING_ORIGIN ?? 'http://localhost:3002';
const appUrl = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Koode — Learn coding like a game. Teach it like a class.',
  description:
    'Pathways, challenges, and a friendly tutor — built for classrooms and curious learners.',
  openGraph: {
    title: 'Koode — Learn coding like a game. Teach it like a class.',
    description:
      'Pathways, challenges, and a friendly tutor — built for classrooms and curious learners.',
    url: siteUrl,
    siteName: 'Koode',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Koode — Learn coding like a game. Teach it like a class.',
    description:
      'Pathways, challenges, and a friendly tutor — built for classrooms and curious learners.',
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
