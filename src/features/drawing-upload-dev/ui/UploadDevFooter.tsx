import { useMemo, useState } from 'react';
import type { usePartReview } from '../review/usePartReview';
import type { usePdfAnalysis } from '../usePdfAnalysis';
import type { UploadMode } from '../types';
import { exportAnalysis } from '../analysisSummary';
import { ActionButton } from './sharedStyles';
import { TaskFooter } from './TaskFooter';
import type { ActionMenuItem } from './ActionMenu';
import { AWQ_SHAPE_NAME_MODEL, shapeNameModelLabel } from '../shape-name/shapeNameTypes';
import { confirmedLibraryParts } from '../review/libraryReview';
import { LibraryPublishDialog } from '@/features/part-library/LibraryPublishDialog';

export function UploadDevFooter({ mode, analysis, review, onMode, onPdf, onReviewJson, onRetry, onOcrRetry, libraryCount }: {
  mode: UploadMode; analysis: ReturnType<typeof usePdfAnalysis>; review: ReturnType<typeof usePartReview>;
  onMode: (mode: UploadMode) => void; onPdf: () => void; onReviewJson: () => void; onRetry: () => void; onOcrRetry: () => void;
  libraryCount: number;
}) {
  const isBusy = analysis.status === 'running' || analysis.status === 'loading';
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const current = review.current;
  const libraryParts = useMemo(() => current ? confirmedLibraryParts(current.document, current.groupList, current.partList) : [], [current]);
  const shapeRun = review.shapeNameRun;
  const shapeMessage = shapeRun && (shapeRun.status === 'running'
    ? shapeRun.model === AWQ_SHAPE_NAME_MODEL && shapeRun.completed === 0
      ? '로컬 27B 준비·형상 분석 중 · 모델 전환에 몇 분 걸릴 수 있습니다.'
      : '로컬 ' + shapeNameModelLabel(shapeRun.model) + ' 형상 분석 중 · ' + shapeRun.completed + '/' + shapeRun.total + '종'
    : shapeRun.status === 'error' ? shapeRun.message
    : shapeRun.status === 'cancelled' ? '형상 분석을 중지했습니다.'
    : '형상 추정 ' + shapeRun.suggested + '종 · 보류 ' + (shapeRun.total - shapeRun.suggested) + '종 · 추가 ' + (shapeRun.elapsedMs / 1000).toFixed(1) + '초');
  const message = review.loadError || review.current?.message || (review.current?.isDirty ? '저장되지 않은 변경이 있습니다.' : review.current && mode !== 'analysis' ? '전체 ' + review.current.partList.length + '종 · 확정 ' + review.current.partList.filter((part) => part.status === 'confirmed').length + '종 · 3D 연결 ' + review.current.modelLinks.length + '건' : review.isPreparing ? '부품 묶음과 저장된 검토를 준비하고 있습니다.' : isBusy ? 'PDF를 분석하고 있습니다. 완료되면 부품을 검토하세요.' : analysis.status === 'complete' ? '추출한 부품을 원문과 대조해 검토하세요.' : 'PDF를 선택하면 분석이 시작됩니다.');
  const items: ActionMenuItem[] = mode === 'analysis' ? [
    { label: 'STEP 파일 연결하기', ariaLabel: 'STEP · 3D 연결', group: '3D', onClick: () => onMode('model'), disabled: isBusy },
    { label: '추출 결과 파일로 저장', ariaLabel: '추출 결과 저장', group: '파일', onClick: () => analysis.file && exportAnalysis(analysis.file, analysis.pageList, analysis.status), disabled: !analysis.file || !analysis.pageList.length || isBusy },
    ...(analysis.file ? [{ label: '이 PDF 다시 분석', ariaLabel: '다시 분석', group: '다시 시작', onClick: onRetry, disabled: isBusy }] : []),
    ...(analysis.file ? [{ label: 'OCR로 다시 읽기', description: 'PDF의 글자층이 잘못됐을 때 이미지로 재인식', group: '다시 시작', onClick: onOcrRetry, disabled: isBusy }] : []),
  ] : [
    { label: '검토 파일 불러오기', ariaLabel: '검토 JSON 불러오기', description: '현재 PDF의 검토 JSON 파일 선택', group: '파일', onClick: onReviewJson, disabled: !review.current },
    { label: '검토 파일 내보내기', ariaLabel: 'JSON 내보내기', description: '부품 검토와 3D 연결을 JSON으로 보관', group: '파일', onClick: review.exportFile, disabled: !review.current },
  ];
  if (analysis.file || mode !== 'analysis') items.push(
    { label: 'PDF로 3D 만들기', ariaLabel: 'PDF → 3D 예시', group: '예시 둘러보기', onClick: () => onMode('generate'), disabled: isBusy },
    { label: '조립품 편집하기', ariaLabel: '조립품 편집 예시', group: '예시 둘러보기', onClick: () => onMode('assembly'), disabled: isBusy },
  );
  if (shapeRun?.status === 'running') items.push({ label: '형상 분석 중지', group: '로컬 Qwen', onClick: review.stopShapeNames });
  if (shapeRun?.status === 'error' || shapeRun?.status === 'cancelled') items.push({ label: '형상 분석 다시 시도', group: '로컬 Qwen', onClick: review.retryShapeNames });
  if (mode === 'review' && libraryParts.length) items.push({ label: '확정 부품 라이브러리에 등록', group: '부품 라이브러리', onClick: () => setIsLibraryOpen(true) });
  if (libraryCount && mode === 'analysis') items.push({ label: '다른 PDF 선택', group: '파일', onClick: onPdf });
  if (libraryCount && mode === 'review') items.push({ label: 'STEP · 3D 연결', group: '3D', onClick: () => onMode('model') });
  const libraryButton = libraryCount > 0 && <ActionButton onClick={() => onMode('library-assembly')}>라이브러리 3D 조립 · {libraryCount}개</ActionButton>;
  return <><TaskFooter message={<>{message}{shapeRun && <><br /><span data-shape-run={shapeRun.status} data-shape-model={shapeRun.model} data-shape-elapsed-ms={shapeRun.elapsedMs}>{shapeMessage}</span></>}</>} isError={!!review.loadError || !!review.current?.isError || shapeRun?.status === 'error'} items={items}>
    {mode !== 'analysis' ? <>
      {mode === 'review' && libraryCount > 0 ? libraryButton : <ActionButton disabled={!review.current?.groupList.length} onClick={() => onMode(mode === 'review' ? 'model' : 'review')}>{mode === 'review' ? 'STEP · 3D 연결' : '부품 검토·보정'}</ActionButton>}
      {review.current ? <ActionButton $primary onClick={review.save}>검토 결과 저장</ActionButton> : <ActionButton $primary onClick={onPdf}>PDF 선택</ActionButton>}
    </> : <>
      {libraryCount > 0 ? libraryButton : analysis.file && <ActionButton onClick={onPdf}>다른 PDF 선택</ActionButton>}
      {isBusy ? <ActionButton onClick={analysis.cancel}>분석 중지</ActionButton> : analysis.file && <ActionButton $primary disabled={!review.current?.groupList.length} onClick={() => onMode('review')}>부품 검토·보정</ActionButton>}
    </>}
  </TaskFooter>{isLibraryOpen && libraryParts.length > 0 && <LibraryPublishDialog parts={libraryParts} onClose={() => setIsLibraryOpen(false)} />}</>;
}
