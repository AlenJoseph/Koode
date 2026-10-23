import Link from 'next/link';
import { DocsShell } from '@/components/DocsShell';
import { DOC_PAGES } from '@/lib/docs';

export default function DocsHomePage() {
  return (
    <DocsShell current="home">
      <h1>Koode documentation</h1>
      <p>
        Public docs shell for local demos and onboarding. Source of truth lives in the repo{' '}
        <code>docs/</code> folder.
      </p>
      <div className="card-grid">
        {DOC_PAGES.map((page) => (
          <Link key={page.slug} className="card" href={`/${page.slug}`}>
            <strong>{page.title}</strong>
            <span>{page.file}</span>
          </Link>
        ))}
      </div>
    </DocsShell>
  );
}
