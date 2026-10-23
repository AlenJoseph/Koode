import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_LANDING_ORIGIN ?? 'http://localhost:3002';
const appUrl = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Koode | Personal intelligence for human growth',
  description:
    'Open learning platform for life skills and UN SDG-aligned pathways: money, wildlife, civic sense, cooking, first aid, business, teaching. Classrooms and independent learners. AI tutor that scaffolds, not spoils.',
  openGraph: {
    title: 'Koode | Personal intelligence for human growth',
    description:
      'Students practise real life skills with pathways and a gentle tutor. Teachers run classrooms. Aligned with UN Sustainable Development Goals.',
    url: siteUrl,
    siteName: 'Koode',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Koode | Personal intelligence for human growth',
    description:
      'Life-skill pathways for students and classrooms, mapped to UN SDGs. Clear product for learners, teachers, and investors.',
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
