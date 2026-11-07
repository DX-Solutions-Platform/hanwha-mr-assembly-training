import type { Evidence, SourceRect, TextToken } from '../types';
import { unionRect } from '../textLayout';

export const OCR_ENGINE_ID = 'tesseract-7.0.0-eng-kor-best-int-1';
export const OCR_CONFIDENCE_THRESHOLD = 80;
export interface OcrWord { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number }; baseline?: { y0: number; y1: number }; lineBox?: { y1: number }; joinWithPrevious?: boolean; }
export interface OcrResult { wordList: OcrWord[]; confidence: number; }
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const inside = (rect: SourceRect, x: number, y: number) => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
export function needsPageOcr(native: TextToken[], imageRects: SourceRect[]) {
  return imageRects.some((rect) => rect.width * rect.height >= .08 && native.filter((token) => inside(rect, token.rect.x + token.rect.width / 2, token.rect.y + token.rect.height / 2)).reduce((count, token) => count + token.text.length, 0) < 80);
}
export function normalizeOcrWords(result: OcrResult, width: number, height: number): TextToken[] {
  if (result.wordList.length > 30000) throw new Error('OCR 단어가 너무 많습니다. 도면을 나누어 올려 주세요.');
  const tokens: TextToken[] = [];
  for (const word of result.wordList) {
    const { bbox } = word;
    if (!word.text.trim() || ![bbox.x0, bbox.y0, bbox.x1, bbox.y1].every(Number.isFinite)) continue;
    const x = clamp(bbox.x0 / width), y = clamp(bbox.y0 / height), right = clamp(bbox.x1 / width), bottom = clamp(bbox.y1 / height);
    if (right <= x || bottom <= y) continue;
    const lineBottom = word.baseline ? (word.baseline.y0 + word.baseline.y1) / 2 : word.lineBox?.y1 ?? bbox.y1;
    const token: TextToken = { text: word.text.trim(), rect: { x, y, width: right - x, height: bottom - y }, rotation: 0, method: 'ocr', confidence: Number.isFinite(word.confidence) ? Math.max(0, Math.min(100, word.confidence)) : 0, baseline: clamp(lineBottom / height) };
    const previous = tokens[tokens.length - 1];
    if (word.joinWithPrevious && previous && Math.abs((previous.baseline ?? 0) - token.baseline!) < .01) {
      previous.text += token.text; previous.rect = unionRect([previous.rect, token.rect]); previous.confidence = Math.min(previous.confidence ?? 0, token.confidence ?? 0);
    } else tokens.push(token);
  }
  return tokens;
}
export function mergeOcrTokens(native: TextToken[], recognized: TextToken[]) {
  return [...native, ...recognized.filter((token) => !native.some((source) => inside(source.rect, token.rect.x + token.rect.width / 2, token.rect.y + token.rect.height / 2)))];
}
export function markOcrEvidence(source: Evidence, tokenList: TextToken[]): Evidence {
  const tokens = tokenList.filter((token) => {
    const width = Math.max(0, Math.min(source.rect.x + source.rect.width, token.rect.x + token.rect.width) - Math.max(source.rect.x, token.rect.x));
    const height = Math.max(0, Math.min(source.rect.y + source.rect.height, token.rect.y + token.rect.height) - Math.max(source.rect.y, token.rect.y));
    return width * height > Math.min(source.rect.width * source.rect.height, token.rect.width * token.rect.height) * .25;
  });
  const recognized = tokens.filter((token) => token.method === 'ocr');
  if (!recognized.length) return source;
  return { ...source, method: recognized.length === tokens.length ? 'ocr' : 'mixed', confidence: Math.min(source.confidence ?? 100, ...recognized.map((token) => token.confidence ?? 0)) };
}
