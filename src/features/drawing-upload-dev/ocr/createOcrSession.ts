import type { OcrResult } from './ocrModel';
import type { AnalysisProgress } from '../types';

export function createOcrSession(signal: AbortSignal) {
  let worker: Worker | null = null, sequence = 0;
  let cancelJob: ((reason: Error) => void) | null = null;
  const abortError = () => new DOMException('OCR 분석을 중지했습니다.', 'AbortError');
  const terminate = () => { worker?.terminate(); worker = null; };
  const abort = () => { cancelJob?.(abortError()); terminate(); };
  signal.addEventListener('abort', abort, { once: true });
  const recognize = async (canvas: HTMLCanvasElement, onProgress: (value: NonNullable<AnalysisProgress['ocr']>) => void): Promise<OcrResult> => {
    if (signal.aborted) throw abortError();
    const image = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('OCR용 이미지 변환에 실패했습니다.')), 'image/png'));
    if (signal.aborted) throw abortError();
    worker ??= new Worker('/drawing-ocr-worker.js');
    const current = worker, id = ++sequence;
    return new Promise<OcrResult>((resolve, reject) => {
      const finish = (reason?: Error, result?: OcrResult) => {
        clearTimeout(timer); current.onmessage = null; current.onerror = null; current.onmessageerror = null; cancelJob = null;
        if (reason) { terminate(); reject(reason); } else resolve(result!);
      };
      const timer = setTimeout(() => finish(new Error('OCR이 120초 안에 완료되지 않았습니다. 도면을 나누거나 해상도를 조절해 다시 분석해 주세요.')), 120000);
      cancelJob = (reason) => finish(reason);
      current.onerror = (event) => { event.preventDefault(); finish(new Error('OCR 실행 파일을 불러오지 못했습니다. 다시 분석해 주세요.')); };
      current.onmessageerror = () => finish(new Error('OCR 결과를 읽지 못했습니다. 다시 분석해 주세요.'));
      current.onmessage = ({ data }) => {
        if (data.id !== id || signal.aborted) return;
        if (data.type === 'progress') onProgress({ stage: data.status === 'recognizing text' ? 'recognizing' : 'loading', progress: Math.max(0, Math.min(1, Number(data.progress) || 0)) });
        else if (data.type === 'error') finish(new Error('OCR 인식에 실패했습니다. 다시 분석해 주세요.'));
        else if (data.type === 'result') {
          if (!Array.isArray(data.wordList)) { finish(new Error('OCR 결과 형식이 올바르지 않습니다.')); return; }
          finish(undefined, { wordList: data.wordList, confidence: Number.isFinite(data.confidence) ? data.confidence : 0 });
        }
      };
      onProgress({ stage: 'loading', progress: 0 });
      current.postMessage({ id, type: 'recognize', image });
    });
  };
  return { recognize, close: () => { signal.removeEventListener('abort', abort); cancelJob?.(abortError()); terminate(); } };
}
