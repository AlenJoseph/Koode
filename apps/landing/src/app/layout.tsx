import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_LANDING_ORIGIN ?? 'http://localhost:3002';
const appUrl = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Koode — Personal intelligence for human growth',
  description:
    'Learn life skills that matter: money sense, wildlife care, civic duty, cooking, first aid, business, teaching — and software when it helps. Pathways and a gentle tutor for classrooms and independent learners.',
  openGraph: {
    title: 'Koode — Personal intelligence for human growth',
    description:
      'Learn life. Practise judgement. Grow capable — money, nature, civic sense, cooking, first aid, business, teaching, and making tools when they serve a real need.',
    url: siteUrl,
    siteName: 'Koode',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Koode — Personal intelligence for human growth',
    description:
      'Learn life. Practise judgement. Grow capable — real-world pathways for classrooms and independent learners.',
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
