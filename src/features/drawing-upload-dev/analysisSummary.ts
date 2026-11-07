import type { AnalysisProgress, AnalysisStatus, DrawingPage, TaskId } from './types';

export function summarizePages(pageList: DrawingPage[]) {
  const partList = pageList.flatMap((page) => page.partList);
  const dimensionList = pageList.flatMap((page) => page.dimensionList);
  return {
    tableRowCount: partList.filter((part) => part.kind === 'table').length,
    codeCount: new Set(partList.map((part) => part.partNumber).filter(Boolean)).size,
    dimensionCount: dimensionList.filter((dimension) => dimension.kind !== 'candidate').length,
    candidateCount: dimensionList.filter((dimension) => dimension.kind === 'candidate').length,
    textCount: pageList.reduce((count, page) => count + page.textCount, 0),
    imageOnlyCount: pageList.filter((page) => page.textCount < 20).length,
    ocrPageCount: pageList.filter((page) => page.ocr).length,
    ocrFailedCount: pageList.filter((page) => page.ocr?.status === 'failed').length,
    ocrEmptyCount: pageList.filter((page) => page.ocr?.status === 'empty').length,
    ocrLowConfidenceCount: pageList.reduce((count, page) => count + (page.ocr?.lowConfidenceWordCount ?? 0), 0),
  };
}

export function getPageLabel(page: DrawingPage) {
  if (page.partList.some((part) => part.kind === 'table')) return '부품표 추출';
  if (page.dimensionList.some((dimension) => dimension.kind !== 'candidate')) return '치수 표기 추출';
  if (page.partList.length) return '부품번호 확인';
  return page.textCount < 20 ? '이미지 원문 확인 필요' : '텍스트 추출';
}

const TASK_LIST: { id: TaskId; name: string }[] = [
  { id: 'file', name: '파일 읽기' }, { id: 'render', name: '도면 이미지 변환' },
  { id: 'text', name: '글자 · 좌표 추출' }, { id: 'ocr', name: '스캔 글자 인식 · OCR' }, { id: 'parts', name: '부품표 행 분석' },
  { id: 'dimensions', name: '치수 표기 추출' }, { id: 'finish', name: '결과 정리' },
];
export function getAnalysisTasks(progress: AnalysisProgress, status: AnalysisStatus, pageList: DrawingPage[], file: File | null) {
  const summary = summarizePages(pageList);
  const activeIndex = TASK_LIST.findIndex((task) => task.id === progress.task);
  return TASK_LIST.map((task, index) => {
    const isFile = task.id === 'file', isFinish = task.id === 'finish';
    const completed = isFile ? (progress.total ? 1 : 0) : isFinish ? (status === 'complete' ? 1 : 0) : Math.min(progress.total, Math.max(pageList.length, (progress.pageNumber ?? 1) - 1 + (index < activeIndex && progress.task !== 'finish' ? 1 : 0)));
    const total = isFile || isFinish ? 1 : progress.total;
    let state = status === 'idle' ? 'idle' : completed === total && total > 0 ? 'done' : status === 'error' && index === activeIndex ? 'error' : status === 'cancelled' ? 'cancelled' : index === activeIndex || (!isFile && !isFinish && pageList.length > 0 && status === 'running') ? 'running' : 'idle';
    let detail = total && !isFile && !isFinish ? completed + '/' + total + '쪽' : '대기';
    if (isFile && file) detail = (file.size / 1024 / 1024).toFixed(2) + ' MB · PDF';
    if (task.id === 'text' && pageList.length) detail += ' · ' + summary.textCount.toLocaleString('ko-KR') + '자';
    if (task.id === 'ocr') {
      if (progress.task === 'ocr' && status === 'running') detail = progress.pageNumber + '쪽 · ' + (progress.ocr?.stage === 'recognizing' ? '글자 인식 ' + Math.round((progress.ocr?.progress ?? 0) * 100) + '%' : '인식기 준비 중');
      else if (status === 'complete') { detail = summary.ocrPageCount ? summary.ocrPageCount + '쪽 실행 · 실패 ' + summary.ocrFailedCount + '쪽 · 글자 없음 ' + summary.ocrEmptyCount + '쪽' : '텍스트 PDF · OCR 생략'; if (summary.ocrFailedCount) state = 'error'; }
    }
    if (task.id === 'parts' && pageList.length) detail += ' · 표 ' + summary.tableRowCount + '행 · 번호 ' + summary.codeCount + '종';
    if (task.id === 'dimensions' && pageList.length) detail += ' · 표기 ' + summary.dimensionCount + '개';
    if (isFinish && status === 'complete') detail = pageList.length + '쪽 · 원문 위치 연결';
    return { ...task, completed, total, state, detail };
  });
}

export function exportAnalysis(file: File, pageList: DrawingPage[], status: AnalysisStatus) {
  const payload = {
    schemaVersion: 1, analyzedAt: new Date().toISOString(), status,
    source: { fileName: file.name, size: file.size }, summary: summarizePages(pageList),
    notes: ['PDF 텍스트와 스캔 OCR의 좌표 기반 추출 결과입니다. OCR 값·부품번호 후보·수치 후보는 원문 확인이 필요합니다.', '조립 순서·체결 토크 확정은 포함하지 않습니다.'],
    pages: pageList.map((page) => ({ pageNumber: page.pageNumber, width: page.width, height: page.height, textCount: page.textCount, lineList: page.lineList, partList: page.partList, dimensionList: page.dimensionList, unit: page.unit, unitSource: page.unitSource, warningList: page.warningList, ...(page.ocr ? { ocr: page.ocr } : {}) })),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name.replace(/\.pdf$/i, '') + '-analysis.json'; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
