import { useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import type { useStepModel } from './useStepModel';
import type { StepAssemblyPart } from './stepAssemblyParts';
import { STEP_FILE_ACCEPT, STEP_MAX_FILE_MB, type StepBounds } from './stepTypes';
import { shapeLabel } from './stepModel';
import { StepPreviewBoundary } from './StepPreviewBoundary';
import { ActionButton, Muted } from '../ui/sharedStyles';
import { ReviewHeader, ReviewPanel, ReviewTitle } from '../review/reviewStyles';

const StepScene = dynamic(() => import('./StepScene'), { ssr: false, loading: () => <p>3D 미리보기를 준비하고 있습니다.</p> });
const PHASE_LABEL = { file: 'STEP 파일 확인', engine: '변환기 준비', convert: 'STEP 형상 읽기', geometry: '3D 미리보기 구성' };
type StepController = ReturnType<typeof useStepModel>;

export function StepLoadStatus({ step }: { step: StepController }) {
  if (step.status === 'running') return <Status role="status">{step.pendingName} · {PHASE_LABEL[step.phase]} <button onClick={step.cancel}>중지</button></Status>;
  if (step.error) return <Status role={step.status === 'error' ? 'alert' : 'status'}>{step.error}{step.status === 'error' && <button onClick={step.retry}>다시 시도</button>}</Status>;
  return null;
}

interface AssemblySelection {
  selected: StepAssemblyPart | null;
  selectShape: (id: string | null) => void;
  openFile: () => void;
}

export function StepViewer({ step, assembly }: { step: StepController; assembly?: AssemblySelection }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isIsolated, setIsIsolated] = useState(false);
  const [view, setView] = useState({ command: 0, focusBounds: null as StepBounds | null });
  const [previewKey, setPreviewKey] = useState(0);
  const shape = step.model?.manifest.shapeList.find((item) => item.id === step.selectedId);
  const part = assembly?.selected;
  const selectedShapeIds = useMemo(() => part?.shapeIds ?? (shape ? [shape.id] : []), [part, shape]);
  const selectedBounds = part?.bounds ?? shape?.bounds;
  const selection = part?.name ?? (shape ? shapeLabel(shape) + ' · 형상 ' + (shape.meshIndex + 1) : null);
  const openFile = assembly?.openFile ?? (() => inputRef.current?.click());
  const focus = (focusBounds: StepBounds | null) => setView((value) => ({ command: value.command + 1, focusBounds }));
  const selectShape = (id: string | null) => {
    if (!id) setIsIsolated(false);
    (assembly?.selectShape ?? step.select)(id);
  };
  return <ReviewPanel aria-label="STEP 3D 미리보기" data-step-status={step.status}
    onDragOver={assembly ? undefined : (event) => event.preventDefault()}
    onDrop={assembly ? undefined : (event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void step.load(file); }}>
    <ReviewHeader><ReviewTitle>STEP · 3D 미리보기</ReviewTitle><ActionButton onClick={openFile}>{assembly ? '다른 STEP 열기' : step.model ? '다른 STEP 선택' : 'STEP 선택'}</ActionButton></ReviewHeader>
    <Metadata>
      <span>{step.model?.manifest.name ?? '.step / .stp · ' + STEP_MAX_FILE_MB + 'MB 이하'}</span>
      {step.model && <Muted>{step.model.manifest.shapeList.length}개 형상 · 단위 mm · 드래그 회전 · 휠 확대 · {assembly ? '부품' : '형상'} 클릭 선택</Muted>}
      <StepLoadStatus step={step} />
    </Metadata>
    <Viewport aria-label="3D 형상 표시 영역">
      {step.model ? <StepPreviewBoundary key={step.model.manifest.sha256 + '-' + previewKey} onRetry={() => setPreviewKey((value) => value + 1)}>
        <StepScene model={step.model} selectedShapeIds={selectedShapeIds} isIsolated={isIsolated} command={view.command} focusBounds={view.focusBounds} onSelect={selectShape} />
      </StepPreviewBoundary> : <Empty><strong>STEP 파일을 올려 주세요.</strong><Muted>모델을 선택하고 검토한 부품번호에 연결할 수 있습니다.</Muted><ActionButton $primary onClick={openFile}>STEP 파일 선택</ActionButton></Empty>}
    </Viewport>
    <Toolbar>
      <ToolButton disabled={!step.model} onClick={() => focus(null)}>전체 맞춤</ToolButton>
      <ToolButton disabled={!selectedBounds} onClick={() => focus(selectedBounds ?? null)}>선택 맞춤</ToolButton>
      <ToolButton disabled={!selectedBounds} aria-pressed={isIsolated} onClick={() => setIsIsolated((value) => !value)}>
        {isIsolated ? (assembly ? '전체 보기' : '전체 표시') : (assembly ? '선택 부품만 보기' : '선택만 표시')}
      </ToolButton>
    </Toolbar>
    <Selection>{selection ? '선택: ' + selection : assembly ? '왼쪽 목록이나 3D 화면에서 부품을 선택하세요.' : '3D 형상이나 오른쪽 목록을 선택하세요.'}</Selection>
    {!assembly && <input ref={inputRef} type="file" accept={STEP_FILE_ACCEPT} aria-label="미리볼 STEP 선택" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void step.load(file); event.target.value = ''; }} />}
  </ReviewPanel>;
}
const Metadata = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2], padding: theme.space[3], fontSize: theme.size.md, overflowWrap: 'anywhere', flexShrink: 0 }));
const Status = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'center', gap: theme.space[3], color: theme.color.warning, fontSize: theme.size.sm, lineHeight: 1.6, button: { color: theme.color.primarySoft, textDecoration: 'underline' } }));
const Viewport = styled.div(({ theme }) => ({ position: 'relative', flex: 1, minHeight: theme.space[8] * 3, background: theme.color.bgMid, overflow: 'hidden' }));
const Empty = styled.div(({ theme }) => ({ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: theme.space[5], padding: theme.space[5], textAlign: 'center', strong: { fontSize: theme.size.xl } }));
const Toolbar = styled.div(({ theme }) => ({ display: 'flex', gap: theme.space[2], padding: theme.space[3], flexShrink: 0 }));
const ToolButton = styled(ActionButton)(({ theme }) => ({ flex: 1, minHeight: theme.space[6], fontSize: theme.size.sm }));
const Selection = styled.div(({ theme }) => ({ padding: theme.space[3], color: theme.color.primarySoft, fontSize: theme.size.sm, borderTop: '1px solid ' + theme.color.primaryLineWeak, overflowWrap: 'anywhere', flexShrink: 0 }));
