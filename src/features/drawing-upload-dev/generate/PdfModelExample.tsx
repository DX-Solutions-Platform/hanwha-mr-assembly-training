import { useRef, useState } from 'react';
import styled from 'styled-components';
import { useFlangeExample } from './useFlangeExample';
import { FlangeEditor } from './FlangeEditor';
import { FlangePreview } from './FlangePreview';
import { ReviewDocument } from '../review/ReviewDocument';
import { ActionButton, Muted } from '../ui/sharedStyles';
import { TaskFooter } from '../ui/TaskFooter';
import type { Evidence } from '../types';
import type { LibraryMatch } from '@/features/part-library/libraryTypes';
import { RegisterFlangeDialog } from './RegisterFlangeDialog';
import type { GeneratedFlangeDraft } from './useFlangeDrafts';
import type { OutlineFlangeLink } from './outlineFlangeLinks';

export function PdfModelExample({ isActive, initialFile = null, initialDraft, onFileLoaded, onRegistered }: {
  isActive: boolean; initialFile?: File | null; initialDraft?: GeneratedFlangeDraft; onFileLoaded: (file: File) => void; onRegistered?: (match: LibraryMatch, link?: OutlineFlangeLink) => void;
}) {
  const example = useFlangeExample(isActive, initialFile, initialDraft);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [pageNumber, setPageNumber] = useState(initialDraft?.source.evidence.outerDiameter.pageNumber ?? 1);
  const pdfInput = useRef<HTMLInputElement>(null), jsonInput = useRef<HTMLInputElement>(null);
  const state = example.state;
  if (!isActive) return null;
  const isBlocked = example.isLoading || example.isExporting;
  const canSave = !!state && !example.hasUnapplied && !isBlocked;
  const canRegisterHere = !!(state && initialDraft && state.source === initialDraft.source && onRegistered);
  const handleInspect = (source: Evidence) => { setEvidence(source); setPageNumber(source.pageNumber); };
  const handlePdf = async (file: File) => {
    setEvidence(null); setPageNumber(1);
    if (await example.load(file)) onFileLoaded(file);
  };
  return <>
    <Banner><strong>{example.sourceKind === 'example' ? '완성 예시 · 원형 플랜지' : '업로드한 PDF · 원형 플랜지'}</strong><span>{state?.source.outline ? '정면도 윤곽 → 비율 확인 → 실제 치수 입력·확정' : 'PDF 읽기 → 치수 7개 검증 → 3D 생성 → 수정·확정·저장'}</span><Muted>STEP 없이 사용 · 플랜지 규칙 기반 · 외부 AI 호출 없음</Muted><LoadButton disabled={isBlocked} onClick={() => pdfInput.current?.click()}>같은 형식의 PDF 선택</LoadButton></Banner>
    <Workspace aria-label={example.sourceKind === 'example' ? 'PDF 3D 생성 예시' : '업로드 PDF 3D 생성'} aria-busy={example.isLoading}>
      {state ? <>
        <ReviewDocument key={state.source.document.sha256} pageList={state.source.pageList} pageNumber={pageNumber} source={evidence ?? state.source.evidence.outerDiameter} sourceUrl={state.source.sourceUrl} onPageChange={(page) => { setPageNumber(page); setEvidence(null); }} />
        <FlangePreview example={example} />
        <FlangeEditor example={example} onInspect={handleInspect} lockIdentity={canRegisterHere} />
      </> : <Empty role="status"><strong>{example.error ? '3D 모델을 준비하지 못했습니다.' : 'PDF를 읽고 있습니다.'}</strong><Muted>{example.error || '원문 치수를 읽은 뒤 3D 모델과 수정 입력값이 표시됩니다.'}</Muted>{example.error && !example.isLoading && <ActionButton onClick={() => void example.load(initialFile ?? undefined)}>PDF 다시 읽기</ActionButton>}</Empty>}
    </Workspace>
    <TaskFooter isError={!!example.error} message={<>{example.error || example.message}{state?.isDirty && ' · 저장되지 않은 변경'}</>} items={[
      { label: '파일 불러오기', ariaLabel: '생성 JSON 불러오기', description: '보관한 JSON 파일에서 이어서 편집', group: '파일', onClick: () => jsonInput.current?.click(), disabled: !state || isBlocked },
      { label: '파일로 내보내기', ariaLabel: '생성 JSON 내보내기', description: 'JSON 파일 · 입력값과 생성 결과', group: '파일', onClick: example.exportJson, disabled: !canSave },
      { label: 'PDF 원문 값으로 되돌리기', ariaLabel: 'PDF 원문 값으로', group: '다시 시작', onClick: example.reset, disabled: !state || isBlocked, danger: true },
    ]}><ActionButton $primary={!canRegisterHere} disabled={!canSave} onClick={example.save}>생성 결과 저장</ActionButton>
      {canRegisterHere && <ActionButton $primary disabled={!canSave || state?.status !== 'confirmed'} onClick={() => setIsRegisterOpen(true)}>라이브러리에 GLB 등록</ActionButton>}
    </TaskFooter>
    {isRegisterOpen && canRegisterHere && state && <RegisterFlangeDialog state={state} onClose={() => setIsRegisterOpen(false)} onRegistered={(match) => {
      setIsRegisterOpen(false);
      onRegistered?.(match, state.source.outline ? { key: state.source.outline.key, partNumber: match.partNumber, quantity: Number(state.applied.part.quantity) } : undefined);
    }} />}
    <input ref={pdfInput} type="file" accept=".pdf,application/pdf" aria-label="3D 생성용 PDF 선택" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void handlePdf(file); event.target.value = ''; }} />
    <input ref={jsonInput} type="file" accept=".json,application/json" aria-label="3D 생성 JSON 선택" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void example.importJson(file); event.target.value = ''; }} />
  </>;
}
const Banner = styled.div(({ theme }) => ({ position: 'absolute', left: theme.space[8], right: theme.space[8], top: theme.space[8] * 4 + theme.space[4], display: 'flex', alignItems: 'center', gap: theme.space[5], padding: theme.space[3] + 'px ' + theme.space[4] + 'px', border: '1px solid ' + theme.color.primaryLine, background: theme.color.primaryFill, fontSize: theme.size.md, strong: { color: theme.color.primarySoft, fontWeight: theme.weight.medium }, span: { minWidth: 0 } }));
const LoadButton = styled(ActionButton)(({ theme }) => ({ marginLeft: 'auto', minHeight: theme.space[6], fontSize: theme.size.sm }));
const Workspace = styled.div(({ theme }) => ({ position: 'absolute', left: theme.space[8], right: theme.space[8], top: theme.space[8] * 5 + theme.space[2], bottom: theme.space[8] + theme.space[5], display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.15fr) minmax(0,.95fr)', gap: theme.space[4] }));
const Empty = styled.div(({ theme }) => ({ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: theme.space[5], border: '1px solid ' + theme.color.primaryLineWeak, fontSize: theme.size.xl }));
