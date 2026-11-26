export type InlineSegment =
  | { kind: 'text'; text: string; bold: boolean }
  | { kind: 'link'; text: string; url: string };

export type MarkdownBlock =
  | { kind: 'heading'; segments: InlineSegment[] }
  | { kind: 'paragraph'; segments: InlineSegment[] }
  | { kind: 'bullet'; segments: InlineSegment[] }
  | { kind: 'numbered'; index: string; segments: InlineSegment[] };

const TRUSTED_LINK_HOSTS = ['backbone.ritmodiag.com', 'drive.google.com', 'docs.google.com'];
const INLINE_PATTERN = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

/**
 * Les réponses de Mobot peuvent reprendre du contenu tiers : seuls les liens
 * vers Backbone et Google Drive restent cliquables (même règle que le web).
 */
export function isTrustedMobotLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && TRUSTED_LINK_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

function pushText(segments: InlineSegment[], text: string, bold: boolean) {
  if (text) segments.push({ kind: 'text', text, bold });
}

export function parseInline(line: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let cursor = 0;
  for (const match of line.matchAll(INLINE_PATTERN)) {
    pushText(segments, line.slice(cursor, match.index), false);
    if (match[1] !== undefined) {
      pushText(segments, match[1], true);
    } else if (isTrustedMobotLink(match[3])) {
      segments.push({ kind: 'link', text: match[2], url: match[3] });
    } else {
      pushText(segments, match[2], false);
    }
    cursor = (match.index ?? 0) + match[0].length;
  }
  pushText(segments, line.slice(cursor), false);
  return segments;
}

function toBlock(line: string): MarkdownBlock | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
  if (heading) return { kind: 'heading', segments: parseInline(heading[1]) };
  const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
  if (bullet) return { kind: 'bullet', segments: parseInline(bullet[1]) };
  const numbered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
  if (numbered) return { kind: 'numbered', index: numbered[1], segments: parseInline(numbered[2]) };
  return { kind: 'paragraph', segments: parseInline(trimmed) };
}

/** Markdown simple produit par Mobot : titres, listes, paragraphes, gras, liens. Les images sont ignorées. */
export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const withoutImages = markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', segments: parseInline(paragraph.join(' ')) });
      paragraph = [];
    }
  };

  for (const line of withoutImages.split('\n')) {
    const block = toBlock(line);
    if (!block) {
      flushParagraph();
    } else if (block.kind === 'paragraph') {
      paragraph.push(line.trim());
    } else {
      flushParagraph();
      blocks.push(block);
    }
  }
  flushParagraph();
  return blocks;
}
