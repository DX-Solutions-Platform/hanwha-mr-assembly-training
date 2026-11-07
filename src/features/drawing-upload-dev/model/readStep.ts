import { createStepModel } from './stepModel';
import type { StepMesh, StepModel, StepNode, StepPhase } from './stepTypes';

export async function readStep(file: File, signal: AbortSignal, onPhase: (phase: StepPhase) => void): Promise<StepModel> {
  const check = () => { if (signal.aborted) throw new DOMException('STEP 읽기를 중지했습니다.', 'AbortError'); };
  if (!/\.(step|stp)$/i.test(file.name)) throw new Error('.step 또는 .stp 파일을 선택해 주세요.');
  if (file.size > 25 * 1024 * 1024) throw new Error('25 MB 이하의 STEP을 선택해 주세요.');
  onPhase('file');
  const buffer = await file.arrayBuffer(); check();
  const text = new TextDecoder().decode(buffer);
  if (!text.slice(0, 1024).includes('ISO-10303-21') || !text.includes('END-ISO-10303-21')) throw new Error('유효한 STEP 파일이 아닙니다.');
  if (/(?:DOCUMENT_FILE|EXTERNAL_SOURCE)\s*\([^;]*'[^']+\.(?:stp|step)'/i.test(text)) throw new Error('외부 STEP 부품을 참조하는 파일입니다. 모든 부품을 포함한 단일 STEP으로 내보내 주세요.');
  const digest = await crypto.subtle.digest('SHA-256', buffer); check();
  const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return new Promise((resolve, reject) => {
    const worker = new Worker('/step-import-worker.js');
    let settled = false;
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); worker.terminate(); };
    const fail = (reason: Error) => { if (!settled) { settled = true; cleanup(); reject(reason); } };
    const abort = () => fail(new DOMException('STEP 읽기를 중지했습니다.', 'AbortError'));
    const timer = window.setTimeout(() => fail(new Error('STEP 변환 시간이 초과되었습니다. 조립품을 나누거나 단순화해 주세요.')), 120000);
    worker.onerror = () => fail(new Error('STEP 변환 중 오류가 발생했습니다. 다시 시도하거나 단순화한 모델을 선택해 주세요.'));
    worker.onmessage = ({ data }: MessageEvent<{ type: string; phase?: StepPhase; message?: string; root: StepNode; meshes: StepMesh[] }>) => {
      if (settled) return;
      if (data.type === 'progress' && data.phase) onPhase(data.phase);
      if (data.type === 'error') fail(new Error(data.message || 'STEP을 읽지 못했습니다.'));
      if (data.type === 'complete') {
        try { const model = createStepModel(file, sha256, data.root, data.meshes); settled = true; cleanup(); resolve(model); }
        catch (reason) { fail(reason instanceof Error ? reason : new Error('STEP 형상 데이터 오류입니다.')); }
      }
    };
    signal.addEventListener('abort', abort, { once: true });
    worker.postMessage({ buffer }, [buffer]);
    if (signal.aborted) abort();
  });
}
