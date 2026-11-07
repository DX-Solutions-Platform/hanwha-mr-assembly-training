import type { AnalysisProgress, OcrPageInfo } from '../types';
import type { createOcrSession } from './createOcrSession';
import { normalizeOcrWords, OCR_CONFIDENCE_THRESHOLD, OCR_ENGINE_ID } from './ocrModel';

export async function readPageOcr(canvas: HTMLCanvasElement, session: ReturnType<typeof createOcrSession>, signal: AbortSignal, onProgress: (value: NonNullable<AnalysisProgress['ocr']>) => void) {
  try {
    const result = await session.recognize(canvas, onProgress);
    if (signal.aborted) throw new DOMException('OCR을 중지했습니다.', 'AbortError');
    const tokens = normalizeOcrWords(result, canvas.width, canvas.height);
    const lowConfidenceWordCount = tokens.filter((token) => (token.confidence ?? 0) < OCR_CONFIDENCE_THRESHOLD).length;
    const info: OcrPageInfo = { engine: OCR_ENGINE_ID, status: tokens.length ? 'complete' : 'empty', confidence: result.confidence, wordCount: tokens.length, lowConfidenceWordCount };
    const warnings = [tokens.length ? 'OCR로 읽은 값입니다. 품명·수량·재질과 치수는 원문과 대조한 뒤 확정하세요.' : 'OCR을 실행했지만 읽을 수 있는 글자를 찾지 못했습니다. 더 선명한 스캔본을 사용해 주세요.'];
    if (lowConfidenceWordCount) warnings.push('OCR 신뢰도가 낮은 단어 ' + lowConfidenceWordCount + '개가 있습니다. 숫자·기호를 특히 확인해 주세요.');
    return { tokens, info, warnings };
  } catch (reason) {
    if (signal.aborted) throw reason;
    const message = reason instanceof Error ? reason.message : 'OCR을 실행하지 못했습니다.';
    const info: OcrPageInfo = { engine: OCR_ENGINE_ID, status: 'failed', confidence: 0, wordCount: 0, lowConfidenceWordCount: 0, error: message };
    return { tokens: [], info, warnings: [message + ' 이 페이지의 이미지와 PDF 텍스트만 보존했습니다. 다시 분석하거나 원문을 확인해 주세요.'] };
  }
}
export async function makePagePreview(canvas: HTMLCanvasElement) {
  const scale = Math.min(1, 1300 / canvas.width, Math.sqrt(2000000 / (canvas.width * canvas.height)));
  const preview = document.createElement('canvas'); preview.width = Math.ceil(canvas.width * scale); preview.height = Math.ceil(canvas.height * scale);
  try {
    const context = preview.getContext('2d'); if (!context) throw new Error('PDF 미리보기를 만들지 못했습니다.');
    context.drawImage(canvas, 0, 0, preview.width, preview.height);
    const blob = await new Promise<Blob>((resolve, reject) => preview.toBlob((value) => value ? resolve(value) : reject(new Error('페이지 이미지 변환에 실패했습니다.')), 'image/jpeg', .9));
    return URL.createObjectURL(blob);
  } finally { preview.width = 0; preview.height = 0; }
}
