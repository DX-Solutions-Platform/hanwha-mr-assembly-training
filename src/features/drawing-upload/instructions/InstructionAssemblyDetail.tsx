import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import type { StepAssemblyPart } from '@/features/drawing-upload-dev/model/stepAssemblyParts';
import type { StepBounds, StepModel } from '@/features/drawing-upload-dev/model/stepTypes';
import { StepPreviewBoundary } from '@/features/drawing-upload-dev/model/StepPreviewBoundary';
import { ActionButton, Muted, ScrollArea } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { groupInstructions, type AssemblyInstruction } from './assemblyInstructions';
import { getInstructionFigureRequests, InstructionAssemblyFigures } from './InstructionSheetPreview';
import { useStepDrawings } from './useStepDrawings';

const StepScene = dynamic(() => import('@/features/drawing-upload-dev/model/StepScene'), {
  ssr: false, loading: () => <Muted role="status">3D 조립품을 준비하고 있습니다.</Muted>,
});

export function InstructionAssemblyDetail({ model, parts, instructions, activeId, onSelect, onCompare }: {
  model: StepModel; parts: StepAssemblyPart[]; instructions: AssemblyInstruction[];
  activeId?: string; onSelect: (id: string) => void; onCompare: (id: string, basePartNumber: number | null) => void;
}) {
  const groups = useMemo(() => groupInstructions(instructions), [instructions]);
  const rows = groups.flatMap((group) => group.steps.map((step, index) => ({ step, label: `${group.number}-${index + 1}` })));
  const activeIndex = Math.max(0, rows.findIndex(({ step }) => step.id === activeId));
  const row = rows[activeIndex];
  const part = row && parts[row.step.partNumber - 1];
  const base = row?.step.basePartNumber ? parts[row.step.basePartNumber - 1] : null;
  if (!row || !part) return null;

  return (
    <DetailGrid>
      <DetailColumn>
        <StepTitle aria-live="polite">{row.label} · {part.name} #{part.number}</StepTitle>
        <AssemblyLocation key={row.step.id} model={model} parts={parts} step={row.step} part={part} base={base ?? null}
          onCompare={(number) => onCompare(row.step.id, number)} />
        <InstructionText>
          <strong>작업 설명</strong>
          <p>{row.step.description}</p>
          {row.step.tool && <Muted>공구 · {row.step.tool}</Muted>}
          {row.step.torque && <Muted>토크 · {row.step.torque}</Muted>}
        </InstructionText>
        <Toolbar>
          <ActionButton disabled={activeIndex === 0} onClick={() => onSelect(rows[activeIndex - 1].step.id)}>이전 단계</ActionButton>
          <ActionButton disabled={activeIndex === rows.length - 1} onClick={() => onSelect(rows[activeIndex + 1].step.id)}>다음 단계</ActionButton>
        </Toolbar>
      </DetailColumn>
      <DetailColumn aria-label="조립 상세 단계 목록">
        <strong>조립 단계 {rows.length}개</strong>
        <DetailList>
          {rows.map(({ step, label }) => (
            <DetailChoice key={step.id} type="button" aria-pressed={step.id === row.step.id} onClick={() => onSelect(step.id)}>
              {label} · {parts[step.partNumber - 1]?.name} #{step.partNumber}
            </DetailChoice>
          ))}
        </DetailList>
      </DetailColumn>
    </DetailGrid>
  );
}

function AssemblyLocation({ model, parts, step, part, base, onCompare }: {
  model: StepModel; parts: StepAssemblyPart[]; step: AssemblyInstruction; part: StepAssemblyPart;
  base: StepAssemblyPart | null; onCompare: (number: number | null) => void;
}) {
  const [isPicking, setIsPicking] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [view, setView] = useState({ command: 0, bounds: null as StepBounds | null });

  function selectShape(id: string | null) {
    if (!isPicking || !id) return;
    const picked = parts.find((candidate) => candidate.shapeIds.includes(id));
    if (!picked || picked.number === part.number) return;
    onCompare(picked.number);
    setIsPicking(false);
  }

  function focus(bounds: StepBounds | null) {
    setView((current) => ({ command: current.command + 1, bounds }));
  }

  return (
    <>
      <Muted>주황색은 이번에 장착할 부품입니다. 드래그로 회전하고 휠로 확대하세요.</Muted>
      <Viewport role="region" aria-label="조립 상세 3D" $picking={isPicking}>
        <StepPreviewBoundary key={previewKey} onRetry={() => setPreviewKey((key) => key + 1)}>
          <StepScene model={model} selectedShapeIds={part.shapeIds} referenceShapeIds={base?.shapeIds} showThrough
            isIsolated={false} command={view.command} focusBounds={view.bounds} onSelect={selectShape} />
        </StepPreviewBoundary>
      </Viewport>
      <Toolbar>
        <ActionButton onClick={() => focus(null)}>전체 맞춤</ActionButton>
        <ActionButton onClick={() => focus(part.bounds)}>장착 부품 확대</ActionButton>
        {parts.length > 1 && <ActionButton aria-pressed={isPicking} $primary={isPicking} onClick={() => setIsPicking(!isPicking)}>
          {isPicking ? '부품 선택 취소' : base ? '비교 부품 변경' : '전·후 비교'}
        </ActionButton>}
        {base && <ActionButton onClick={() => { onCompare(null); setIsPicking(false); }}>비교 해제</ActionButton>}
      </Toolbar>
      {isPicking && <Muted role="status">장착 전 그림에 남길 주변 부품을 3D 화면에서 클릭하세요.</Muted>}
      {base && <>
        <Muted>비교 부품 · #{base.number} {base.name} · 3D에서 파란색으로 표시</Muted>
        <DetailComparison key={base.number} model={model} stepId={step.id} part={part} base={base} />
      </>}
    </>
  );
}

function DetailComparison({ model, stepId, part, base }: {
  model: StepModel; stepId: string; part: StepAssemblyPart; base: StepAssemblyPart;
}) {
  const requests = useMemo(() => getInstructionFigureRequests(stepId, part, base), [stepId, part, base]);
  const images = useStepDrawings(model, requests);
  return <InstructionAssemblyFigures stepId={stepId} part={part} base={base} images={images} />;
}

const DetailGrid = styled(ScrollArea)(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(200px, 1fr)',
  gap: theme.space[4], padding: theme.space[4], alignItems: 'start',
  '@media (max-width: 720px)': { gridTemplateColumns: '1fr' },
}));
const DetailColumn = styled.section(({ theme }) => ({
  display: 'grid', minWidth: 0, gap: theme.space[3], padding: theme.space[4],
  background: theme.color.panel, border: '1px solid ' + theme.color.primaryLineWeak, overflowWrap: 'anywhere',
}));
const StepTitle = styled.h3(({ theme }) => ({ margin: 0, color: theme.color.primarySoft, fontSize: theme.size.lg }));
const Viewport = styled.div<{ $picking: boolean }>(({ theme, $picking }) => ({
  position: 'relative', height: 'clamp(250px, 42vh, 490px)', background: theme.color.bgMid,
  outline: $picking ? '1px solid ' + theme.color.primary : undefined, cursor: $picking ? 'crosshair' : 'grab',
}));
const Toolbar = styled.div(({ theme }) => ({ display: 'flex', flexWrap: 'wrap', gap: theme.space[2] }));
const InstructionText = styled.div(({ theme }) => ({
  display: 'grid', gap: theme.space[1], borderTop: '1px solid ' + theme.color.primaryLineWeak, paddingTop: theme.space[3],
  '& p': { margin: 0, whiteSpace: 'pre-wrap' },
}));
const DetailList = styled(ScrollArea)(({ theme }) => ({ display: 'grid', gap: theme.space[2], maxHeight: '60vh' }));
const DetailChoice = styled.button(({ theme }) => ({
  textAlign: 'left', overflowWrap: 'anywhere', padding: theme.space[3], font: 'inherit', color: theme.color.ink,
  border: '1px solid ' + theme.color.primaryLineWeak, background: 'transparent', cursor: 'pointer',
  '&[aria-pressed="true"]': { borderColor: theme.color.primary, background: theme.color.primaryFill },
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft },
}));
