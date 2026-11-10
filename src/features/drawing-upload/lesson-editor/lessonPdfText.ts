import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const ink = rgb(.12, .16, .2);

export function textTools(font: PDFFont, normalize: (value: string) => string = (value) => value) {
  const supported = new Set(font.getCharacterSet());
  const clean = (value: string) => Array.from(normalize(value)).map((letter) =>
    supported.has(letter.codePointAt(0)!) || letter === '\n' ? letter : letter === '\t' ? ' ' : '□').join('');
  function wrap(value: string, size: number, width: number) {
    return clean(value).split(/\r?\n/).flatMap((paragraph) => {
      const lines: string[] = [];
      let line = '';
      for (const word of paragraph.trim().split(/\s+/)) {
        const next = line ? line + ' ' + word : word;
        if (font.widthOfTextAtSize(next, size) <= width) { line = next; continue; }
        if (line) lines.push(line);
        line = '';
        for (const character of word) {
          if (line && font.widthOfTextAtSize(line + character, size) > width) { lines.push(line); line = ''; }
          line += character;
        }
      }
      return [...lines, line];
    });
  }
  function draw(page: PDFPage, value: string, x: number, y: number, size: number, color = ink) {
    page.drawText(clean(value.replace(/\s*\r?\n\s*/g, ' ')), { x, y, size, color, font });
  }
  return { wrap, draw };
}

export async function loadFont(weight: 'Regular' | 'SemiBold', signal: AbortSignal) {
  const response = await fetch('/fonts/pretendard/Pretendard-' + weight + '.ttf', { signal });
  if (!response.ok) throw new Error('PDF에 사용할 프리텐다드 글꼴을 열 수 없습니다.');
  return response.arrayBuffer();
}
