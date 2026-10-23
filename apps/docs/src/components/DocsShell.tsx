import Link from 'next/link';
import type { ReactNode } from 'react';
import { DOC_PAGES } from '@/lib/docs';

type Props = {
  children: ReactNode;
  current?: string;
};

export function DocsShell({ children, current }: Props) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          Koode Docs
        </Link>
        <p>Product docs for the monorepo.</p>
        <nav aria-label="Docs">
          <Link href="/" aria-current={current === 'home' ? 'page' : undefined}>
            Home
          </Link>
          {DOC_PAGES.map((page) => (
            <Link
              key={page.slug}
              href={`/${page.slug}`}
              aria-current={current === page.slug ? 'page' : undefined}
            >
              {page.title}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
