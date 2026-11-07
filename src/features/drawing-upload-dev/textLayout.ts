import type { SourceRect, TextLine, TextToken } from './types';

export function unionRect(rectList: SourceRect[]): SourceRect {
  const x = Math.min(...rectList.map((rect) => rect.x));
  const y = Math.min(...rectList.map((rect) => rect.y));
  return {
    x, y,
    width: Math.max(...rectList.map((rect) => rect.x + rect.width)) - x,
    height: Math.max(...rectList.map((rect) => rect.y + rect.height)) - y,
  };
}

/** Group horizontal text by baseline, independently of PDF stream ordering. */
export function buildTextLines(tokenList: TextToken[]): TextLine[] {
  const rowList: TextToken[][] = [];
  const horizontalList = tokenList.filter((token) => Math.abs(Math.sin(token.rotation)) < 0.12);
  for (const token of [...horizontalList].sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)) {
    const row = rowList.find((candidate) => {
      const first = candidate[0];
      const baseline = first.baseline ?? first.rect.y + first.rect.height;
      return Math.abs(baseline - (token.baseline ?? token.rect.y + token.rect.height)) < Math.max(first.rect.height, token.rect.height) * 0.45;
    });
    if (row) row.push(token); else rowList.push([token]);
  }
  const lineList = rowList.map((row) => {
    const sorted = row.sort((a, b) => a.rect.x - b.rect.x);
    return { text: sorted.map((token) => token.text).join(' ').replace(/\s+/g, ' ').trim(), rect: unionRect(sorted.map((token) => token.rect)), tokenList: sorted };
  });
  // Rotated dimensions remain searchable, with their original page rectangle.
  for (const token of tokenList.filter((item) => Math.abs(Math.sin(item.rotation)) >= 0.12)) {
    lineList.push({ text: token.text, rect: token.rect, tokenList: [token] });
  }
  return lineList.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
}

export function normalizeText(text: string) {
  return text.normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC').toLowerCase();
}

/** Split runs of spaces in a single PDF text item without discarding its position. */
export function splitTextToken(token: TextToken): TextToken[] {
  const matches = [...token.text.matchAll(/\S(?:.*?\S)?(?=\s{2,}|$)/g)];
  if (matches.length < 2) return [token];
  return matches.map((match) => ({
    ...token, text: match[0],
    rect: { ...token.rect, x: token.rect.x + token.rect.width * match.index! / token.text.length, width: token.rect.width * match[0].length / token.text.length },
  }));
}
