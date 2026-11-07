import { useState } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import type { StepAssemblyPart } from '@/features/drawing-upload-dev/model/stepAssemblyParts';
import type { StepBounds, StepModel, StepPick } from '@/features/drawing-upload-dev/model/stepTypes';
import { StepPreviewBoundary } from '@/features/drawing-upload-dev/model/StepPreviewBoundary';
import { ReviewInput, ReviewLabel } from '@/features/drawing-upload-dev/review/reviewStyles';
import { ActionButton, Muted } from '@/features/drawing-upload-dev/ui/sharedStyles';
import type { AssemblyInstruction } from '../instructions/assemblyInstructions';
import { isPracticeReady, savePracticeConfig, type PracticeConfig, type PracticeDraft } from './stepPracticeConfig';
import { Panel, Toolbar, Viewport, Workspace } from './stepPracticeStyles';

const StepScene = dynamic(() => import('@/features/drawing-upload-dev/model/StepScene'), { ssr: false });
const StepPracticePlayer = dynamic(() => import('./StepPracticePlayer'), { ssr: false });
type Task = 'placement' | 'fastening';
const taskNames = { placement: '1. 부품 배치', fastening: '2. 볼트 체결' };
const noShapes: readonly string[] = [];

export function StepPracticeWorkspace({ model, parts, instructions, draft, onChange }: {
  model: StepModel; parts: StepAssemblyPart[]; instructions: AssemblyInstruction[]; draft: PracticeDraft;
  onChange: (draft: PracticeDraft) => void;
}) {
  const [task, setTask] = useState<Task>('placement');
  const [isIsolated, setIsolated] = useState(false);
  const [view, setView] = useState({ command: 0, bounds: null as StepBounds | null });
  const [previewKey, setPreviewKey] = useState(0);
  const [notice, setNotice] = useState('');
  const [running, setRunning] = useState<PracticeConfig | null>(null);
  const target = draft[task];
  const part = target && parts[target.partNumber - 1];
  const otherPart = draft[task === 'placement' ? 'fastening' : 'placement']?.partNumber;
  const canStart = isPracticeReady(draft, parts.length);

  function focus(bounds: StepBounds | null) {
    setView((current) => ({ command: current.command + 1, bounds }));
  }

  function selectTask(next: Task) {
    setTask(next); setIsolated(false); setNotice(''); focus(null);
  }

  function selectPart(candidate: StepAssemblyPart, pick?: StepPick) {
    if (candidate.number === otherPart) {
      setNotice('두 작업에는 서로 다른 부품을 지정하세요.');
      return;
    }
    const changed = candidate.number !== target?.partNumber;
    const next = { ...draft, [task]: { partNumber: candidate.number, pick: pick ?? (changed ? undefined : target?.pick) } };
    if (task === 'fastening' && changed) {
      const instruction = instructions.find((step) => step.partNumber === candidate.number);
      next.tool = instruction?.tool ?? '';
      next.torque = '';
      next.exampleTorque = false;
    }
    setNotice('');
    onChange(next);
  }

  function pickPart(id: string | null, pick?: StepPick) {
    if (!id || !pick) return;
    const candidate = parts.find((item) => item.shapeIds.includes(id));
    if (candidate) selectPart(candidate, pick);
  }

  function start() {
    if (!isPracticeReady(draft, parts.length)) return;
    setNotice(savePracticeConfig(model.manifest.sha256, draft) ? '이 STEP의 실습 설정을 이 브라우저에 저장했습니다.'
      : '브라우저 저장 공간을 사용할 수 없습니다. 현재 화면에서 실습할 수 있습니다.');
    setRunning(draft);
  }

  if (running) return <StepPracticePlayer model={model} parts={parts} instructions={instructions} config={running}
    notice={notice} onSetup={() => setRunning(null)} />;

  return (
    <Workspace>
      <Panel>
        <Toolbar>
          <ActionButton aria-pressed={task === 'placement'} $primary={task === 'placement'} onClick={() => selectTask('placement')}>{taskNames.placement}</ActionButton>
          <ActionButton aria-pressed={task === 'fastening'} $primary={task === 'fastening'} onClick={() => selectTask('fastening')}>{taskNames.fastening}</ActionButton>
        </Toolbar>
        <Muted>{task === 'placement' ? '배치할 부품의 표면을 클릭하세요. STEP의 장착 위치에 주황색 점이 표시됩니다.'
          : '체결할 볼트 머리의 평평한 면 중심을 클릭하세요. 지정한 점이 확대와 공구 회전의 기준이 됩니다.'}</Muted>
        <Viewport role="region" aria-label="실습 설정 3D">
          <StepPreviewBoundary key={previewKey} onRetry={() => setPreviewKey((key) => key + 1)}>
            <StepScene model={model} selectedShapeIds={part?.shapeIds ?? noShapes} marker={target?.pick?.point}
              isIsolated={isIsolated} command={view.command} focusBounds={view.bounds} onSelect={pickPart} showThrough />
          </StepPreviewBoundary>
        </Viewport>
        <Toolbar>
          <ActionButton onClick={() => { setIsolated(false); focus(null); }}>전체 맞춤</ActionButton>
          <ActionButton disabled={!part} aria-pressed={isIsolated} onClick={() => setIsolated(!isIsolated)}>
            {isIsolated ? '전체 조립품 보기' : '선택 부품만 보기'}
          </ActionButton>
          <ActionButton disabled={!part} onClick={() => focus(part?.bounds ?? null)}>선택 부품 확대</ActionButton>
        </Toolbar>
      </Panel>
      <Panel>
        <h3>{taskNames[task]}</h3>
        <Status aria-live="polite">{part ? `#${part.number} ${part.name}` : '부품을 선택하세요.'}<br />
          {target?.pick ? '3D 위치 지정 완료' : '3D에서 위치를 클릭하세요.'}</Status>
        <PartList aria-label="실습 설정 부품 목록">
          {parts.map((candidate) => <PartButton key={candidate.number} type="button" aria-pressed={candidate === part}
            disabled={candidate.number === otherPart} onClick={() => { selectPart(candidate); focus(candidate.bounds); }}>
            #{candidate.number} {candidate.name}
          </PartButton>)}
        </PartList>
        {task === 'fastening' && <>
          <ReviewLabel>사용 공구<ReviewInput maxLength={48} value={draft.tool} onChange={(event) => onChange({ ...draft, tool: event.target.value })} /></ReviewLabel>
          <ReviewLabel>목표 토크 (N·m)<ReviewInput value={draft.torque} inputMode="decimal" maxLength={12} placeholder="작업지시서의 수치"
            onChange={(event) => onChange({ ...draft, torque: event.target.value, exampleTorque: false })} /></ReviewLabel>
          <ActionButton onClick={() => onChange({ ...draft, torque: '1.0', exampleTorque: true })}>교육용 예시값 사용</ActionButton>
          <Muted>{draft.exampleTorque ? '1.0 N·m은 실습 동작 확인용 예시값입니다.' : '실제 작업 교육에는 승인된 토크 수치를 입력하세요.'}</Muted>
        </>}
        <Status role="status">배치 위치 {draft.placement?.pick ? '완료' : '대기'} · 체결 위치 {draft.fastening?.pick ? '완료' : '대기'}</Status>
        {notice && <Muted role="status">{notice}</Muted>}
        <ActionButton $primary disabled={!canStart} onClick={start}>저장하고 웹 실습 시작</ActionButton>
        {!canStart && <Muted>서로 다른 두 부품의 위치와 체결 공구, 목표 토크를 지정하면 실습을 시작할 수 있습니다.</Muted>}
      </Panel>
    </Workspace>
  );
}

const Status = styled.div(({ theme }) => ({ padding: theme.space[2], background: theme.color.primaryFill, fontSize: theme.size.sm }));
const PartList = styled.div(({ theme }) => ({ display: 'grid', gap: theme.space[1], maxHeight: 220, overflowY: 'auto' }));
const PartButton = styled.button(({ theme }) => ({
  textAlign: 'left', overflowWrap: 'anywhere', padding: theme.space[2], color: theme.color.ink, font: 'inherit',
  background: theme.color.panel, border: '1px solid ' + theme.color.primaryLineWeak,
  '&[aria-pressed=true]': { borderColor: theme.color.primary, background: theme.color.primaryFill },
  '&:disabled': { opacity: 0.45 },
}));
