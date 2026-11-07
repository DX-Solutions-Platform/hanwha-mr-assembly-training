import { normalizeText, unionRect } from './textLayout';
import type { DimensionRecord, SourceRect, TextLine, TextToken } from './types';

function matchRect(tokenList: TextToken[], start: number, end: number) {
  let offset = 0;
  const rectList: SourceRect[] = [];
  for (const token of tokenList) {
    const tokenEnd = offset + token.text.length;
    if (start < tokenEnd && end > offset) {
      const left = Math.max(0, start - offset), right = Math.min(token.text.length, end - offset);
      rectList.push(Math.abs(token.rotation) < 0.12 ? { ...token.rect, x: token.rect.x + token.rect.width * left / token.text.length, width: token.rect.width * (right - left) / token.text.length } : token.rect);
    }
    offset = tokenEnd + 1;
  }
  return unionRect(rectList);
}

export function findPageUnit(lineList: TextLine[]): { unit: string | null; unitSource: string | null } {
  for (const line of lineList) {
    const text = normalizeText(line.text);
    const match = text.match(/(?:단위|치수\s*단위|units?|dimensions?\s*(?:are\s*)?in|cotes?\s*en)\s*[:=]?\s*(mm|millimeters?|millimetres?|cm|inches?|inch)\b/i);
    if (match) {
      const unit = /^(mm|milli)/.test(match[1]) ? 'mm' : match[1] === 'cm' ? 'cm' : 'in';
      return { unit, unitSource: line.text };
    }
  }
  return { unit: null, unitSource: null };
}

const NUMBER = String.raw`\d+(?:[.,]\d+)?`;
const PATTERN_LIST: { kind: DimensionRecord['kind']; pattern: RegExp }[] = [
  { kind: 'thread', pattern: new RegExp('(?<![a-zA-Z0-9])M\\s*' + NUMBER + '(?:\\s*[x×X]\\s*' + NUMBER + '){0,2}(?:\\s*[-–]\\s*[4-9][HhGg])?', 'g') },
  { kind: 'diameter', pattern: new RegExp('(?:Ø|ø|⌀|Φ|φ|∅|DIA\\.?|dia\\.?)\\s*' + NUMBER + '(?:\\s*[Hh][6-9])?(?:\\s*±\\s*' + NUMBER + ')?', 'g') },
  { kind: 'radius', pattern: new RegExp('(?<![a-zA-Z0-9])R\\s*' + NUMBER, 'g') },
  { kind: 'angle', pattern: new RegExp(NUMBER + '\\s*°(?:\\s*±\\s*' + NUMBER + ')?', 'g') },
  { kind: 'tolerance', pattern: new RegExp('(?:' + NUMBER + '\\s*)?±\\s*' + NUMBER + '|' + NUMBER + '\\s*\\+\\s*' + NUMBER + '\\s*/?\\s*-\\s*' + NUMBER, 'g') },
  { kind: 'length', pattern: new RegExp('(?<![a-zA-Z0-9])' + NUMBER + '\\s*(?:mm|cm|inches|inch|in\\b|″|")(?![a-zA-Z])', 'g') },
];

export function extractDimensions(lineList: TextLine[], tableLineSet: Set<number>, pageNumber: number, tableRectList: SourceRect[] = []) {
  const dimensionList: DimensionRecord[] = [];
  const { unit, unitSource } = findPageUnit(lineList);
  lineList.forEach((originalLine, lineIndex) => {
    if (tableLineSet.has(lineIndex) && !tableRectList.length) return;
    const tokenList = originalLine.tokenList.filter((token) => !tableRectList.some((rect) => {
      const x = token.rect.x + token.rect.width / 2, y = token.rect.y + token.rect.height / 2;
      return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    }));
    if (!tokenList.length) return;
    const line = { ...originalLine, tokenList, text: tokenList.map((token) => token.text).join(' '), rect: unionRect(tokenList.map((token) => token.rect)) };
    // Do not turn an uncertain OCR tolerance (e.g. 100 £0.1 mm) into a
    // misleading standalone length of 0.1 mm. Keep the whole line for review.
    if (tokenList.some((token) => token.method === 'ocr') && /^\s*\d+(?:[.,]\d+)?\s*[£€¥+]\s*\d/.test(line.text)) {
      dimensionList.push({ id: 'p' + pageNumber + '-dimension-' + dimensionList.length, kind: 'candidate', value: line.text, unit, unitSource, source: { pageNumber, text: line.text, rect: line.rect, confidence: 50 } });
      return;
    }
    const occupiedList: { start: number; end: number }[] = [];
    for (const { kind, pattern } of PATTERN_LIST) {
      pattern.lastIndex = 0;
      for (const match of line.text.matchAll(pattern)) {
        const start = match.index!, end = start + match[0].length;
        if (occupiedList.some((range) => start < range.end && end > range.start)) continue;
        occupiedList.push({ start, end });
        const explicitUnit = match[0].match(/(mm|cm|inches|inch|in\b|″|")$/i)?.[1];
        const dimensionUnit = kind === 'angle' ? '°' : kind === 'thread' ? 'metric' : explicitUnit ? (/^(in|″|")/i.test(explicitUnit) ? 'in' : explicitUnit.toLowerCase()) : unit;
        dimensionList.push({
          id: 'p' + pageNumber + '-dimension-' + dimensionList.length, kind, value: match[0],
          unit: dimensionUnit, unitSource: kind === 'angle' || kind === 'thread' || explicitUnit ? match[0] : unitSource,
          source: { pageNumber, text: line.text, rect: matchRect(tokenList, start, end) },
        });
      }
    }
    // Bare numbers are explicitly labelled candidates. Never assume millimetres.
    for (const token of line.tokenList) {
      const value = token.text.trim();
      if (occupiedList.length || !/^\d{1,4}(?:[.,]\d+)?$/.test(value) || Number(value.replace(',', '.')) <= 0) continue;
      if (token.rect.y < 0.06 || token.rect.y > 0.92 || token.rect.x < 0.025 || token.rect.x > 0.97) continue;
      if (line.text !== value && /[a-zA-Z가-힣]/.test(line.text)) continue;
      dimensionList.push({ id: 'p' + pageNumber + '-dimension-' + dimensionList.length, kind: 'candidate', value, unit, unitSource, source: { pageNumber, text: line.text, rect: token.rect } });
    }
  });
  return { dimensionList, unit, unitSource };
}
