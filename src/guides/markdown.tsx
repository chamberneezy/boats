// The lake guides' Markdown (src/content/lakes/*.md), drawn with the site's own type: the small part
// of Markdown the guides use and nothing more. Headings (#, ##), paragraphs, lists (-), tables, a
// rule (---), **bold** and [links](url). Under the "Frequently asked questions" heading, a
// paragraph that starts with a **bold question** line becomes an open/close question, as on Home.
// No HTML in the text is ever rendered as HTML.
import type { ReactNode } from 'react';

export interface GuideBlock {
  kind: 'h1' | 'h2' | 'p' | 'ul' | 'table' | 'hr' | 'faq';
  lines: string[];
}

export interface FaqItem {
  q: string;
  a: string;
}

const FAQ_HEADING = /^frequently asked questions$/i;

export function parseGuide(source: string): GuideBlock[] {
  const blocks: GuideBlock[] = [];
  let inFaq = false;
  for (const chunk of source.replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = chunk.split('\n').filter((line) => line.trim() !== '');
    if (!lines.length) continue;
    const first = lines[0];
    if (first.startsWith('# ')) blocks.push({ kind: 'h1', lines: [first.slice(2)] });
    else if (first.startsWith('## ')) {
      inFaq = FAQ_HEADING.test(first.slice(3).trim());
      blocks.push({ kind: 'h2', lines: [first.slice(3)] });
    } else if (/^-{3,}$/.test(first.trim())) blocks.push({ kind: 'hr', lines: [] });
    else if (first.startsWith('|')) blocks.push({ kind: 'table', lines });
    else if (first.startsWith('- ')) blocks.push({ kind: 'ul', lines: lines.map((line) => line.replace(/^- /, '')) });
    else if (inFaq && /^\*\*.+\*\*$/.test(first.trim()) && lines.length > 1)
      blocks.push({ kind: 'faq', lines: [first.trim().slice(2, -2), lines.slice(1).join(' ')] });
    else blocks.push({ kind: 'p', lines: [lines.join(' ')] });
  }
  return blocks;
}

/** The guide's questions and answers, plain text, for the FAQ structured data. */
export function guideFaq(blocks: GuideBlock[]): FaqItem[] {
  return blocks.filter((block) => block.kind === 'faq').map(({ lines: [q, a] }) => ({ q, a: plain(a) }));
}

function plain(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[(.+?)\]\((.+?)\)/g, '$1');
}

/** **bold** and [text](url) inside a line. */
export function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[1] !== undefined) out.push(<strong key={match.index}>{match[1]}</strong>);
    else
      out.push(
        <a key={match.index} href={match[3]} target="_blank" rel="noreferrer">
          {match[2]}
        </a>,
      );
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function tableRows(lines: string[]): { head: string[] | null; rows: string[][] } {
  const cells = (line: string) =>
    line
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((cell) => cell.trim());
  const [first, , ...rest] = lines;
  const head = cells(first);
  // A table with an empty header row (the lake facts) has no header.
  return { head: head.every((cell) => cell === '') ? null : head, rows: rest.map(cells) };
}
