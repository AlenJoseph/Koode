import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DOC_PAGES = [
  { slug: 'architecture', file: 'architecture.md', title: 'Architecture' },
  { slug: 'requirements', file: 'requirements-v1.md', title: 'Requirements' },
  { slug: 'epics', file: 'epics-v1.md', title: 'Epics' },
  { slug: 'pathways', file: 'pathways-v1.md', title: 'Pathways' },
  { slug: 'testing', file: 'testing.md', title: 'Testing' },
  { slug: 'privacy', file: 'privacy.md', title: 'Privacy' },
  { slug: 'demo-llm', file: 'demo-llm.md', title: 'Demo LLM' },
] as const;

export type DocSlug = (typeof DOC_PAGES)[number]['slug'];

function docsRoot(): string {
  if (process.env.KOODE_DOCS_ROOT) {
    return process.env.KOODE_DOCS_ROOT;
  }
  // apps/docs → repo docs/
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../docs');
}

export function getDocMeta(slug: string) {
  return DOC_PAGES.find((page) => page.slug === slug) ?? null;
}

export async function readDocMarkdown(slug: string): Promise<string | null> {
  const meta = getDocMeta(slug);
  if (!meta) return null;
  const fullPath = path.join(docsRoot(), meta.file);
  try {
    return await readFile(fullPath, 'utf8');
  } catch {
    return null;
  }
}

/** Tiny markdown → HTML for headings, lists, links, code, paragraphs. No extra packages. */
export function markdownToHtml(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const withInline = escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  const lines = withInline.split('\n');
  const html: string[] = [];
  let inList = false;
  let inCode = false;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length > 0) {
      html.push(`<p>${para.join(' ')}</p>`);
      para = [];
    }
  };

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    if (line.startsWith('```')) {
      flushPara();
      closeList();
      if (inCode) {
        html.push('</code></pre>');
        inCode = false;
      } else {
        html.push('<pre><code>');
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      html.push(`${line}\n`);
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushPara();
      closeList();
      const level = heading[1]!.length;
      html.push(`<h${level}>${heading[2]}</h${level}>`);
      continue;
    }

    if (/^\|/.test(line)) {
      flushPara();
      closeList();
      html.push(`<pre class="table-line">${line}</pre>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushPara();
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${line.replace(/^[-*]\s+/, '')}</li>`);
      continue;
    }

    if (line.trim() === '') {
      flushPara();
      closeList();
      continue;
    }

    closeList();
    para.push(line.trim());
  }

  flushPara();
  closeList();
  if (inCode) html.push('</code></pre>');
  return html.join('\n');
}
