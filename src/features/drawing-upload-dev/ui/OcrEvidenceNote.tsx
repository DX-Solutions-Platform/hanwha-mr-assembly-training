import type { Evidence } from '../types';
import { StateText } from './sharedStyles';

export function OcrEvidenceNote({ source }: { source: Evidence | null }) {
  if (!source?.method) return null;
  return <StateText data-ocr-evidence={source.method} $tone="warning">OCR 인식값 · 원문 대조 필요{source.confidence !== undefined && source.confidence < 80 ? ' · 낮은 신뢰도 포함' : ''}</StateText>;
}
