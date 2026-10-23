import { notFound } from 'next/navigation';
import { DocsShell } from '@/components/DocsShell';
import { DOC_PAGES, getDocMeta, markdownToHtml, readDocMarkdown } from '@/lib/docs';

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return DOC_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const meta = getDocMeta(slug);
  return { title: meta?.title ?? 'Doc' };
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const meta = getDocMeta(slug);
  const markdown = await readDocMarkdown(slug);
  if (!meta || !markdown) {
    notFound();
  }

  return (
    <DocsShell current={slug}>
      <article dangerouslySetInnerHTML={{ __html: markdownToHtml(markdown) }} />
    </DocsShell>
  );
}
