'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { BackButton } from '@/components/common/BackButton';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Stage } from '@/components/common/Stage';
import { StepLoadStatus, StepViewer } from '@/features/drawing-upload-dev/model/StepViewer';
import { getStepAssemblyParts } from '@/features/drawing-upload-dev/model/stepAssemblyParts';
import { STEP_FILE_ACCEPT, STEP_MAX_FILE_MB, type StepModel } from '@/features/drawing-upload-dev/model/stepTypes';
import { useStepModel } from '@/features/drawing-upload-dev/model/useStepModel';
import { ReviewHeader, ReviewInput, ReviewPanel, ReviewTitle } from '@/features/drawing-upload-dev/review/reviewStyles';
import { ActionButton, Muted, ScrollArea } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { AssemblyInstructionsDialog, type InstructionMode } from './instructions/AssemblyInstructionsDialog';
import { createInstructionDrafts } from './instructions/assemblyInstructions';
import { isPracticeReady, readPracticeDraft } from './practice/stepPracticeConfig';

export function StepUploadScreen() {
  const step = useStepModel();
  const input = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropError, setDropError] = useState('');
  const openFile = () => input.current?.click();

  function loadFiles(files: FileList | null) {
    if (!files?.length) return;
    if (files.length > 1) {
      setDropError('조립품 STEP 파일을 한 번에 하나씩 올려 주세요.');
      return;
    }
    setDropError('');
    void step.load(files[0]);
  }

  return (
    <Stage>
      <ScreenHeader
        title="STEP 조립품 가져오기"
        subtitle="CATIA에서 내보낸 조립품을 열고, 3D에서 부품과 장착 위치를 확인하세요."
        action={
          <Navigation>
            <ActionButton as={Link} href="/training/upload-dev">PDF 도면 분석</ActionButton>
            <BackButton href="/training" label="교육 선택" />
          </Navigation>
        }
      />
      <Workspace $isDragging={isDragging}
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragLeave={(event) => {
          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
        }}
        onDrop={(event) => { event.preventDefault(); setIsDragging(false); loadFiles(event.dataTransfer.files); }}>
        {dropError && <DropError role="alert">{dropError}</DropError>}
        {step.model
          ? <AssemblyWorkspace key={step.model.manifest.sha256} model={step.model} step={step} openFile={openFile} />
          : <DropArea aria-label="STEP 조립품 업로드" data-step-status={step.status}>
            <UploadMark aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4" />
              </svg>
            </UploadMark>
            <h2>STEP 파일을 놓아 주세요</h2>
            <Muted>부품 형상이 포함된 단일 STEP · .step / .stp · {STEP_MAX_FILE_MB}MB 이하</Muted>
            <ActionButton $primary onClick={openFile}>STEP 파일 선택</ActionButton>
            <StepLoadStatus step={step} />
          </DropArea>}
        <input ref={input} type="file" accept={STEP_FILE_ACCEPT} aria-label="가져올 STEP 선택" hidden
          onChange={(event) => { loadFiles(event.currentTarget.files); event.currentTarget.value = ''; }} />
      </Workspace>
    </Stage>
  );
}

function AssemblyWorkspace({ model, step, openFile }: {
  model: StepModel; step: ReturnType<typeof useStepModel>; openFile: () => void;
}) {
  const parts = useMemo(() => getStepAssemblyParts(model), [model]);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(100);
  const [instructions, setInstructions] = useState(() => createInstructionDrafts(parts));
  const [instructionMode, setInstructionMode] = useState<InstructionMode | null>(null);
  const [practiceDraft, setPracticeDraft] = useState(() => readPracticeDraft(model.manifest.sha256, parts.length));
  const hasPracticeDraft = isPracticeReady(practiceDraft, parts.length);
  const confirmedCount = instructions.filter((instruction) => instruction.isConfirmed).length;
  const isDetailReady = instructions.length > 0 && confirmedCount === instructions.length;
  const selectedRow = useRef<HTMLButtonElement>(null);
  const selectedId = step.selectedId;
  const selected = selectedId ? parts.find((part) => part.shapeIds.includes(selectedId)) ?? null : null;
  const filter = query.trim().toLowerCase();
  const visibleParts = parts.filter((part) => (part.name + ' ' + part.path).toLowerCase().includes(filter));
  const selectionIndex = selected ? visibleParts.indexOf(selected) : -1;
  const visibleLimit = Math.max(limit, selectionIndex + 1);

  useEffect(() => {
    selectedRow.current?.scrollIntoView({ block: 'nearest' });
  }, [selected, filter]);

  function selectShape(id: string | null) {
    if (id && !visibleParts.some((part) => part.shapeIds.includes(id))) setQuery('');
    step.select(id);
  }

  return (
    <>
    <AssemblyGrid>
      <ReviewPanel aria-label="STEP 부품 목록">
        <ReviewHeader><ReviewTitle>부품 목록</ReviewTitle><Muted>{parts.length}개</Muted></ReviewHeader>
        <Search>
          <ReviewInput type="search" aria-label="부품 검색" placeholder="부품 이름 또는 조립 경로 검색" value={query}
            onChange={(event) => { setQuery(event.target.value); setLimit(100); }} />
          {filter && <Muted>검색 결과 {visibleParts.length}개</Muted>}
        </Search>
        <PartList>
          {visibleParts.slice(0, visibleLimit).map((part) => (
            <PartRow key={part.shapeIds[0]} ref={part === selected ? selectedRow : null}
              aria-pressed={part === selected} onClick={() => step.select(part.shapeIds[0])}>
              <PartTitle><strong>{part.name}</strong><Muted>#{part.number}</Muted></PartTitle>
              <Muted>{part.path || '조립 경로 미기재'} · 형상 {part.shapeIds.length}개</Muted>
            </PartRow>
          ))}
          {!visibleParts.length && <Muted>검색 결과가 없습니다.</Muted>}
          {visibleParts.length > visibleLimit && <ActionButton onClick={() => setLimit(visibleLimit + 100)}>부품 더 보기</ActionButton>}
        </PartList>
      </ReviewPanel>
      <StepViewer step={step} assembly={{ selected, selectShape, openFile }} />
    </AssemblyGrid>
    <InstructionBar aria-label="교육용 도면 작업">
      <div><strong>부품 확인 {confirmedCount} / {instructions.length}개</strong><Muted>교육용 도면은 바로 볼 수 있으며, 전체 부품을 확인하면 조립 상세가 열립니다.</Muted></div>
      <InstructionActions>
        <ActionButton $primary onClick={() => setInstructionMode('drawing')}>교육용 도면 보기</ActionButton>
        <ActionButton disabled={!instructions.length} onClick={() => setInstructionMode('edit')}>작업 단계 등록</ActionButton>
        <ActionButton disabled={!isDetailReady} onClick={() => setInstructionMode('detail')}>조립 상세</ActionButton>
        {hasPracticeDraft && <ActionButton onClick={() => setInstructionMode('practice')}>조립 실습</ActionButton>}
      </InstructionActions>
    </InstructionBar>
    {instructionMode && <AssemblyInstructionsDialog
      mode={instructionMode} onMode={setInstructionMode} onClose={() => setInstructionMode(null)}
      model={model} parts={parts} selected={selected} instructions={instructions} onChange={setInstructions}
      onSelectPart={(part) => selectShape(part.shapeIds[0])}
      practiceDraft={practiceDraft} onPracticeChange={setPracticeDraft}
    />}
    </>
  );
}

const Navigation = styled.nav(({ theme }) => ({ display: 'flex', gap: theme.space[3] }));
const Workspace = styled.main<{ $isDragging: boolean }>(({ theme, $isDragging }) => ({
  position: 'absolute', left: theme.space[8], right: theme.space[8], top: 208, bottom: theme.space[8],
  display: 'flex', flexDirection: 'column', gap: theme.space[3],
  outline: $isDragging ? '2px solid ' + theme.color.primary : undefined,
}));
const DropArea = styled.section(({ theme }) => ({
  flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: theme.space[5], textAlign: 'center', padding: theme.space[6],
  border: '1px dashed ' + theme.color.primaryLine, background: theme.color.panel,
  '& h2': { margin: 0, fontSize: theme.size.xxl },
  '& > button': { paddingInline: theme.space[6] },
}));
const UploadMark = styled.span(({ theme }) => ({
  width: theme.space[8], height: theme.space[8], display: 'grid', placeItems: 'center',
  color: theme.color.primary, background: theme.color.primaryFill,
}));
const DropError = styled.p(({ theme }) => ({ margin: 0, color: theme.color.warning, fontSize: theme.size.md }));
const AssemblyGrid = styled.div(({ theme }) => ({
  flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,3fr)', gap: theme.space[4],
}));
const Search = styled.div(({ theme }) => ({ padding: theme.space[4], display: 'grid', gap: theme.space[2] }));
const PartList = styled(ScrollArea)(({ theme }) => ({
  flex: 1, padding: '0 ' + theme.space[4] + 'px ' + theme.space[4] + 'px',
}));
const PartRow = styled.button(({ theme }) => ({
  display: 'grid', width: '100%', gap: theme.space[1], textAlign: 'left', overflowWrap: 'anywhere',
  padding: theme.space[3], marginBottom: theme.space[2], border: '1px solid ' + theme.color.primaryLineWeak,
  background: theme.color.panel, color: theme.color.ink, fontSize: theme.size.md,
  '&[aria-pressed="true"]': { background: theme.color.primaryFill, borderColor: theme.color.primary },
  '&:hover': { borderColor: theme.color.primary },
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft },
}));
const PartTitle = styled.span(({ theme }) => ({
  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: theme.space[2],
}));
const InstructionBar = styled.section(({ theme }) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: theme.space[4], flexShrink: 0,
  padding: theme.space[3] + 'px ' + theme.space[4] + 'px', background: theme.color.panel,
  border: '1px solid ' + theme.color.primaryLineWeak,
  '& > div:first-child': { display: 'grid', gap: theme.space[1], fontSize: theme.size.md },
}));
const InstructionActions = styled.div(({ theme }) => ({
  display: 'flex', gap: theme.space[2], flexShrink: 0,
}));
