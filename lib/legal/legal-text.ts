/**
 * Turns a legal section body from the string files into blocks: paragraphs are separated by a
 * blank line; a paragraph whose lines start with "• " (or "- ") is a bullet list.
 *
 * @example
 * parseLegalBody('Intro.\n\n• One\n• Two')
 * // [{ kind: 'paragraph', text: 'Intro.' }, { kind: 'bullets', items: ['One', 'Two'] }]
 */
export type LegalBlock = { kind: 'paragraph'; text: string } | { kind: 'bullets'; items: string[] };

const BULLET = /^\s*[•-]\s+/;

export function parseLegalBody(body: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  for (const chunk of body.replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const lines = chunk
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) continue;
    let paragraph: string[] = [];
    let bullets: string[] = [];
    const flushParagraph = () => {
      if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    };
    const flushBullets = () => {
      if (bullets.length) blocks.push({ kind: 'bullets', items: bullets });
      bullets = [];
    };
    for (const line of lines) {
      if (BULLET.test(line)) {
        flushParagraph();
        bullets.push(line.replace(BULLET, ''));
      } else {
        flushBullets();
        paragraph.push(line);
      }
    }
    flushParagraph();
    flushBullets();
  }
  return blocks;
}

/** "2026-11-12" → a short localised date ("12 November 2026"); the input when it can't parse. */
export function formatLegalDate(iso: string, locale: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return iso;
  }
}
