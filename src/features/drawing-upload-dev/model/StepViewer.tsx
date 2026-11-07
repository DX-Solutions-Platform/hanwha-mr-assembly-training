import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import type { useStepModel } from './useStepModel';
import { shapeLabel } from './stepModel';
import { StepPreviewBoundary } from './StepPreviewBoundary';
import { ActionButton, Muted } from '../ui/sharedStyles';
import { ReviewHeader, ReviewPanel, ReviewTitle } from '../review/reviewStyles';

const StepScene = dynamic(() => import('./StepScene'), { ssr: false, loading: () => <p>3D 미리보기를 준비하고 있습니다.</p> });
const PHASE_LABEL = { file: 'STEP 파일 확인', engine: '변환기 준비', convert: 'STEP 형상 읽기', geometry: '3D 미리보기 구성' };
export function StepViewer({ step }: { step: ReturnType<typeof useStepModel> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isIsolated, setIsIsolated] = useState(false);
  const [view, setView] = useState({ command: 0, focusId: null as string | null });
  const [previewKey, setPreviewKey] = useState(0);
  const selected = step.model?.manifest.shapeList.find((shape) => shape.id === step.selectedId);
  return <ReviewPanel aria-label="STEP 3D 미리보기" data-step-status={step.status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void step.load(file); }}>
    <ReviewHeader><ReviewTitle>STEP · 3D 미리보기</ReviewTitle><ActionButton onClick={() => inputRef.current?.click()}>{step.model ? '다른 STEP 선택' : 'STEP 선택'}</ActionButton></ReviewHeader>
    <Metadata>
      <span>{step.model ? step.model.manifest.name : '.step / .stp · 25 MB 이하'}</span>
      {step.model && <Muted>{step.model.manifest.shapeList.length}개 형상 · 단위 mm · 드래그 회전 · 휠 확대 · 형상 클릭 선택</Muted>}
      {step.status === 'running' && <Status role="status">{step.pendingName} · {PHASE_LABEL[step.phase]} <button onClick={step.cancel}>중지</button></Status>}
      {step.error && <Status role={step.status === 'error' ? 'alert' : 'status'}>{step.error}{step.status === 'error' && <button onClick={step.retry}>다시 시도</button>}</Status>}
    </Metadata>
    <Viewport aria-label="3D 형상 표시 영역">
      {step.model ? <StepPreviewBoundary key={step.model.manifest.sha256 + '-' + previewKey} onRetry={() => setPreviewKey((value) => value + 1)}>
        <StepScene model={step.model} selectedId={step.selectedId} isIsolated={isIsolated} command={view.command} focusId={view.focusId} onSelect={step.select} />
      </StepPreviewBoundary> : <Empty><strong>STEP 파일을 올려 주세요.</strong><Muted>모델을 선택하고 검토한 부품번호에 연결할 수 있습니다.</Muted><ActionButton $primary onClick={() => inputRef.current?.click()}>STEP 파일 선택</ActionButton></Empty>}
    </Viewport>
    <Toolbar><ToolButton disabled={!step.model} onClick={() => setView((value) => ({ command: value.command + 1, focusId: null }))}>전체 맞춤</ToolButton><ToolButton disabled={!selected} onClick={() => setView((value) => ({ command: value.command + 1, focusId: step.selectedId }))}>선택 맞춤</ToolButton><ToolButton disabled={!selected} aria-pressed={isIsolated} onClick={() => setIsIsolated((value) => !value)}>{isIsolated ? '전체 표시' : '선택만 표시'}</ToolButton></Toolbar>
    <Selection>{selected ? '선택: ' + shapeLabel(selected) + ' · 형상 ' + (selected.meshIndex + 1) : '3D 형상이나 오른쪽 목록을 선택하세요.'}</Selection>
    <input ref={inputRef} type="file" accept=".step,.stp" aria-label="미리볼 STEP 선택" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void step.load(file); event.target.value = ''; }} />
  </ReviewPanel>;
}
const Metadata = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2], padding: theme.space[3], fontSize: theme.size.md, overflowWrap: 'anywhere', flexShrink: 0 }));
const Status = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'center', gap: theme.space[3], color: theme.color.warning, fontSize: theme.size.sm, lineHeight: 1.6, button: { color: theme.color.primarySoft, textDecoration: 'underline' } }));
const Viewport = styled.div(({ theme }) => ({ position: 'relative', flex: 1, minHeight: theme.space[8] * 3, background: theme.color.bgMid, overflow: 'hidden' }));
const Empty = styled.div(({ theme }) => ({ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: theme.space[5], padding: theme.space[5], textAlign: 'center', strong: { fontSize: theme.size.xl } }));
const Toolbar = styled.div(({ theme }) => ({ display: 'flex', gap: theme.space[2], padding: theme.space[3], flexShrink: 0 }));
const ToolButton = styled(ActionButton)(({ theme }) => ({ flex: 1, minHeight: theme.space[6], fontSize: theme.size.sm }));
const Selection = styled.div(({ theme }) => ({ padding: theme.space[3], color: theme.color.primarySoft, fontSize: theme.size.sm, borderTop: '1px solid ' + theme.color.primaryLineWeak, overflowWrap: 'anywhere', flexShrink: 0 }));
