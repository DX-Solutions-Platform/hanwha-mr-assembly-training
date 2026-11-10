import { useId, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import type { StepAssemblyPart } from '@/features/drawing-upload-dev/model/stepAssemblyParts';
import type { StepBounds, StepModel, StepPick } from '@/features/drawing-upload-dev/model/stepTypes';
import { StepPreviewBoundary } from '@/features/drawing-upload-dev/model/StepPreviewBoundary';
import { ReviewInput, ReviewTextArea } from '@/features/drawing-upload-dev/review/reviewStyles';
import { ActionButton, Muted, ScrollArea } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { getInstructionDrawingTargets, type AssemblyInstruction } from '../instructions/assemblyInstructions';
import { ATTACHMENT_POINT_TOLERANCE, getAttachmentGap, getPracticeTorque, isPracticeMountReady, isPracticeReady, savePracticeConfig, type PracticeDraft, type PracticeMountDraft } from './stepPracticeConfig';
import { createManualPracticeSequence, type PracticeSequence } from './stepPracticeSequence';
import { PracticeHelp } from './PracticeHelp';
import { getFastenerEnds, matchFastenerHead } from './fastenerHead';
import { suggestMountPoints } from './suggestPracticePoints';
import { Panel, Toolbar, Viewport, Workspace } from './stepPracticeStyles';

const StepScene = dynamic(() => import('@/features/drawing-upload-dev/model/StepScene'), { ssr: false });
const StepPracticePlayer = dynamic(() => import('./StepPracticePlayer'), { ssr: false });
type Task = 'placement' | 'support' | 'fastening';
const taskNames = { placement: '장착할 부품 A', support: '받는 부품 B', fastening: '조일 볼트' };
const pickInstructions = { placement: '이번 단계에서 장착할 부품을 고르세요.', support: '이 부품을 어디에 장착하나요?' };
const noShapes: readonly string[] = [];

export function StepPracticeWorkspace({ model, parts, instructions, draft, onChange }: {
  model: StepModel; parts: StepAssemblyPart[]; instructions: AssemblyInstruction[]; draft: PracticeDraft;
  onChange: (draft: PracticeDraft) => void;
}) {
  const [task, setTask] = useState<Task>('placement');
  const [mountIndex, setMountIndex] = useState(0);
  const [isIsolated, setIsolated] = useState(false);
  const [showPair, setShowPair] = useState(() => getAttachmentGap(draft.mounts[0].placement, draft.mounts[0].support) !== null);
  const [view, setView] = useState({ command: 0, bounds: null as StepBounds | null });
  const [previewKey, setPreviewKey] = useState(0);
  const [notice, setNotice] = useState('');
  const [running, setRunning] = useState<PracticeSequence | null>(null);
  const fieldId = useId();
  const mount = draft.mounts[mountIndex];
  const isFastening = task === 'fastening';
  const target = isFastening ? draft.fastening : mount[task];
  const part = target && parts[target.partNumber - 1];
  const placedPart = mount.placement && parts[mount.placement.partNumber - 1];
  const supportPart = mount.support && parts[mount.support.partNumber - 1];
  const startingPart = draft.mounts[0].support?.partNumber;
  const earlierParts = new Set([startingPart, ...draft.mounts.slice(0, mountIndex).map((item) => item.placement?.partNumber)]);
  const usedPlacements = new Set(draft.mounts.filter((_, index) => isFastening || index !== mountIndex).map((item) => item.placement?.partNumber));
  const gap = getAttachmentGap(mount.placement, mount.support);
  const isPairFar = gap !== null && gap > ATTACHMENT_POINT_TOLERANCE;
  const supportReady = !!mount.support?.pick && (mountIndex === 0 || earlierParts.has(mount.support.partNumber));
  const torqueReady = getPracticeTorque(draft.torque) !== null;
  const bolt = draft.fastening && parts[draft.fastening.partNumber - 1];
  const boltPick = draft.fastening?.pick;
  const boltEnds = useMemo(() => bolt ? getFastenerEnds(model, bolt) : [], [model, bolt]);
  const confirmedBoltHead = boltPick && matchFastenerHead(boltEnds, boltPick);
  const shownBoltHead = confirmedBoltHead ?? (boltEnds.length === 1 ? boltEnds[0] : undefined);
  const canStart = !!confirmedBoltHead && isPracticeReady(draft, parts.length);
  const boltAction = !bolt ? '목록에서 조일 볼트를 고르세요.'
    : shownBoltHead ? '화살표가 가리키는 곳을 클릭하세요.' : '볼트 머리의 공구 홈이나 윗면 가운데를 클릭하세요.';
  const orangePoint = isFastening ? shownBoltHead?.point : showPair || task === 'placement' ? mount.placement?.pick?.point : undefined;
  const bluePoint = !isFastening && (showPair || task === 'support') ? mount.support?.pick?.point : undefined;
  const checklist = isFastening ? [
    { label: '공구 대는 위치', done: !!confirmedBoltHead },
    { label: '공구 이름', done: !!draft.tool.trim() },
    { label: '조임 세기', done: torqueReady },
  ] : [
    { label: 'A · 장착 위치', done: !!mount.placement?.pick && !isPairFar },
    { label: 'B · 받는 위치', done: supportReady && !isPairFar },
    { label: '장착 이유', done: !!mount.purpose.trim() },
  ];
  const nextAction = isFastening ? (
    !confirmedBoltHead ? boltAction
      : !draft.tool.trim() ? '사용할 공구 이름을 적으세요.'
      : !torqueReady ? '조임 세기를 입력하거나 교육용 예시값을 선택하세요.' : ''
  ) : (
    !mount.placement ? '목록에서 장착할 부품을 고르세요.'
      : !mount.support ? '이 부품을 받을 부품을 목록에서 고르세요.'
      : !supportReady || !mount.placement.pick || isPairFar ? '연결점 제안을 확인하거나 두 부품에서 맞닿는 곳을 직접 지정하세요.'
      : !mount.purpose.trim() ? '이 위치에 장착하는 이유를 한 줄로 적으세요.' : ''
  );

  function focus(bounds: StepBounds | null) {
    setView((current) => ({ command: current.command + 1, bounds }));
  }

  function selectTask(next: Task) {
    const focusPart = next === 'fastening' ? bolt : undefined;
    setTask(next); setIsolated(!!focusPart); setShowPair(false); setNotice(''); focus(focusPart?.bounds ?? null);
  }

  function editPosition(next: 'placement' | 'support') {
    selectTask(next);
    const selected = next === 'placement' ? placedPart : supportPart;
    if (selected) { setIsolated(true); focus(selected.bounds); }
  }

  function selectMount(index: number) {
    setMountIndex(index); selectTask('placement');
    const next = draft.mounts[index];
    if (next?.placement?.pick && next.support?.pick) {
      setShowPair(true);
      focus(getInstructionDrawingTargets(parts[next.placement.partNumber - 1], parts[next.support.partNumber - 1]).after.bounds);
    }
  }

  function updateMount(patch: Partial<PracticeMountDraft>) {
    onChange({ ...draft, mounts: draft.mounts.map((item, index) => index === mountIndex ? { ...item, ...patch } : item) });
  }

  function canPick(number: number) {
    if (isFastening) return number !== startingPart && !usedPlacements.has(number);
    if (task === 'support' && mountIndex > 0) return earlierParts.has(number) && number !== mount.placement?.partNumber;
    if (task === 'support') return number !== draft.fastening?.partNumber && number !== mount.placement?.partNumber && !usedPlacements.has(number);
    return number !== startingPart && number !== draft.fastening?.partNumber && !usedPlacements.has(number);
  }

  function findPoints(next: PracticeMountDraft) {
    if (!next.placement || !next.support) return false;
    const moving = parts[next.placement.partNumber - 1], receiving = parts[next.support.partNumber - 1];
    const suggestion = suggestMountPoints(model, moving, receiving);
    if (!suggestion) return false;
    updateMount({ ...next, placement: { ...next.placement, pick: suggestion.placement }, support: { ...next.support, pick: suggestion.support } });
    setIsolated(false); setShowPair(true);
    focus(getInstructionDrawingTargets(moving, receiving).after.bounds);
    setNotice('두 부품이 가까운 곳을 A·B 화살표로 표시했습니다. 실제로 맞닿는 위치인지 확인하세요.');
    return true;
  }

  function selectPart(candidate: StepAssemblyPart, pick?: StepPick) {
    if (!canPick(candidate.number)) {
      setNotice(task === 'support' ? '이 단계에서 이미 작업대에 있는 부품을 고르세요.' : '다른 작업에 쓰는 부품입니다. 이번 단계에 사용할 부품을 고르세요.');
      return;
    }
    const changed = candidate.number !== target?.partNumber;
    const nextTarget = { partNumber: candidate.number, pick: pick ?? (changed ? undefined : target?.pick) };
    setNotice('');
    if (!isFastening) {
      const next = { ...mount, [task]: nextTarget, purpose: target && changed ? '' : mount.purpose };
      if (!pick && next.placement && next.support && (changed || !next.placement.pick || !next.support.pick)) {
        if (findPoints(next)) return;
        setNotice('가까운 점을 찾지 못했습니다. 받는 부품을 다시 고르거나 3D에서 맞닿는 곳을 직접 찍으세요.');
      }
      updateMount(next);
      if (!pick && task === 'placement' && !next.support) selectTask('support');
      else if (!pick) { setShowPair(false); setIsolated(true); focus(candidate.bounds); }
      return;
    }
    const instruction = instructions.find((step) => step.partNumber === candidate.number);
    onChange(changed ? { ...draft, fastening: nextTarget, tool: instruction?.tool ?? '', torque: '', exampleTorque: false }
      : { ...draft, fastening: nextTarget });
    if (!pick) { setShowPair(false); setIsolated(true); focus(candidate.bounds); }
  }

  function pickPart(id: string | null, pick?: StepPick) {
    if (!id || !pick) return;
    const candidate = parts.find((item) => item.shapeIds.includes(id));
    if (!candidate) return;
    if (isFastening && !bolt) {
      setNotice('목록에서 조일 볼트를 먼저 고르세요.');
      return;
    }
    if (part && candidate !== part) {
      setNotice('목록에서 고른 부품을 클릭하세요. 가려져 있다면 ‘고른 부품만 보기’를 누르세요.');
      return;
    }
    if (isFastening && !matchFastenerHead(boltEnds, pick)) {
      setNotice('공구를 댈 위치를 클릭해 주세요. 볼트 머리에서 공구 홈이나 윗면 가운데를 찾으세요.');
      return;
    }
    selectPart(candidate, pick);
  }

  function showBothPoints() {
    if (!placedPart || !supportPart) return;
    setIsolated(false);
    setShowPair(true);
    focus(getInstructionDrawingTargets(placedPart, supportPart).after.bounds);
  }

  function start() {
    if (!confirmedBoltHead || !isPracticeReady(draft, parts.length)) return;
    setNotice(savePracticeConfig(model.manifest.sha256, draft) ? '이 STEP의 실습 설정을 이 브라우저에 저장했습니다.'
      : '브라우저 저장 공간을 사용할 수 없습니다. 현재 화면에서 실습할 수 있습니다.');
    setRunning(createManualPracticeSequence(draft, confirmedBoltHead));
  }

  if (running) return <StepPracticePlayer model={model} parts={parts} instructions={instructions} sequence={running}
    notice={notice} onSetup={() => setRunning(null)} />;

  return (
    <Workspace>
      <Panel>
        <strong>실습 순서</strong>
        <Sequence aria-label="실습 순서 편집">
          {draft.mounts.map((item, index) => <ActionButton key={index} aria-pressed={!isFastening && mountIndex === index}
            $primary={!isFastening && mountIndex === index} onClick={() => selectMount(index)}>
            1-{index + 1} · {item.placement ? parts[item.placement.partNumber - 1]?.name : '부품 장착'}
          </ActionButton>)}
          <ActionButton aria-pressed={isFastening} $primary={isFastening} onClick={() => selectTask('fastening')}>1-{draft.mounts.length + 1} · 볼트 체결</ActionButton>
        </Sequence>
        <Toolbar>
          <ActionButton disabled={draft.mounts.length >= parts.length - 2} onClick={() => {
            onChange({ ...draft, mounts: [...draft.mounts, { purpose: '' }] }); selectMount(draft.mounts.length);
          }}>장착 단계 추가</ActionButton>
          {!isFastening && draft.mounts.length > 1 && <ActionButton onClick={() => {
            onChange({ ...draft, mounts: draft.mounts.filter((_, index) => index !== mountIndex) });
            selectMount(Math.max(0, mountIndex - 1));
          }}>현재 장착 단계 삭제</ActionButton>}
        </Toolbar>
        {!isFastening && <Toolbar>
          <ActionButton aria-pressed={task === 'placement' && !showPair} onClick={() => editPosition('placement')}>{placedPart ? 'A 위치 수정' : taskNames.placement}</ActionButton>
          <ActionButton aria-pressed={task === 'support' && !showPair} onClick={() => editPosition('support')}>{supportPart ? 'B 위치 수정' : taskNames.support}</ActionButton>
        </Toolbar>}
        <PracticeHelp topic={task === 'fastening' ? 'bolt' : 'place'}>
          <strong>{isFastening ? (confirmedBoltHead ? '공구를 댈 위치를 확인했습니다.' : boltAction) : pickInstructions[task]}</strong>
        </PracticeHelp>
        <Muted>{isFastening ? '여기서 정한 위치에 실습 중 공구가 놓입니다.'
          : '목록에서 두 부품을 고르면 A·B 화살표가 연결 위치를 가리킵니다. 수정하려면 위에서 A 또는 B를 선택하고 3D에서 맞닿는 곳을 클릭하세요.'}</Muted>
        <Viewport role="region" aria-label="실습 설정 3D">
          <StepPreviewBoundary key={previewKey} onRetry={() => setPreviewKey((key) => key + 1)}>
            <StepScene model={model} selectedShapeIds={(showPair ? placedPart : part)?.shapeIds ?? noShapes}
              referenceShapeIds={showPair ? supportPart?.shapeIds : undefined}
              marker={orangePoint && { point: orangePoint, label: isFastening ? (confirmedBoltHead ? '공구 위치 확인됨' : '여기를 클릭') : 'A · 장착 위치' }}
              referenceMarker={bluePoint && { point: bluePoint, label: 'B · 받는 위치' }}
              isIsolated={isIsolated} command={view.command} focusBounds={view.bounds} onSelect={pickPart}
              viewNormal={isFastening && isIsolated ? shownBoltHead?.normal : undefined} showThrough />
          </StepPreviewBoundary>
        </Viewport>
        <Toolbar>
          <ActionButton onClick={() => { setIsolated(false); setShowPair(false); focus(null); }}>전체 맞춤</ActionButton>
          <ActionButton disabled={!part} aria-pressed={isIsolated} onClick={() => { setShowPair(false); setIsolated(!isIsolated); focus(isIsolated ? null : part?.bounds ?? null); }}>
            {isIsolated ? '전체 조립품 보기' : '고른 부품만 보기'}
          </ActionButton>
          <ActionButton disabled={!part} onClick={() => focus(part?.bounds ?? null)}>고른 부품 확대</ActionButton>
          {task !== 'fastening' && gap !== null && <ActionButton aria-pressed={showPair} onClick={showBothPoints}>A·B 연결 위치 함께 보기</ActionButton>}
        </Toolbar>
        {task !== 'fastening' && <Muted>주황색 A · {placedPart?.name ?? '장착할 부품'}　/　파란색 B · {supportPart?.name ?? '받는 부품'}</Muted>}
        <Muted>드래그하면 모델이 돌고, 마우스 휠로 확대하거나 축소할 수 있습니다.</Muted>
      </Panel>
      <Panel>
        <h3>1-{isFastening ? draft.mounts.length + 1 : mountIndex + 1} · {taskNames[task]}</h3>
        <Status aria-live="polite">{part ? `#${part.number} ${part.name}` : '아래 목록에서 고르세요.'}<br />
          {isFastening ? (confirmedBoltHead ? '✓ 공구 위치 확인 완료' : boltAction)
            : target?.pick ? '✓ 화살표로 위치 표시' : part ? '다음 · 연결할 부품 선택 또는 3D에서 위치 지정' : '먼저 · 부품 선택'}</Status>
        <PartList aria-label="실습 설정 부품 목록">
          {parts.map((candidate) => <PartButton key={candidate.number} type="button" aria-pressed={candidate === part}
            disabled={!canPick(candidate.number)} onClick={() => selectPart(candidate)}>
            #{candidate.number} {candidate.name}
          </PartButton>)}
        </PartList>
        {task !== 'fastening' && <>
          {mount.placement && mount.support && <ActionButton onClick={() => {
            if (!findPoints(mount)) setNotice('가까운 점을 찾지 못했습니다. 두 부품에서 맞닿는 곳을 직접 찍으세요.');
          }}>연결점 다시 찾기</ActionButton>}
          <FieldGroup>
            <label htmlFor={`${fieldId}-purpose`}>왜 이 위치에 장착하나요?</label>
            <ReviewTextArea id={`${fieldId}-purpose`} maxLength={180} value={mount.purpose}
              placeholder="예. 고정 구멍이 맞아야 다음 단계에서 나사를 체결할 수 있습니다."
              onChange={(event) => updateMount({ purpose: event.target.value })} />
          </FieldGroup>
          {task === 'placement' && placedPart && !supportPart && <ActionButton onClick={() => selectTask('support')}>다음 · 받는 부품 고르기</ActionButton>}
          {supportReady && isPracticeMountReady(mount, parts.length) && <ActionButton onClick={() => {
            if (mountIndex + 1 < draft.mounts.length) selectMount(mountIndex + 1);
            else selectTask('fastening');
          }}>다음 단계 설정</ActionButton>}
        </>}
        {task === 'fastening' && <>
          <FieldGroup>
            <PracticeHelp topic="tool" above><label htmlFor={`${fieldId}-tool`}>사용 공구</label></PracticeHelp>
            <ReviewInput id={`${fieldId}-tool`} maxLength={48} value={draft.tool} placeholder="예. Torx 비트"
              onChange={(event) => onChange({ ...draft, tool: event.target.value })} />
          </FieldGroup>
          <FieldGroup>
            <PracticeHelp topic="torque" above><label htmlFor={`${fieldId}-torque`}>조임 세기 (목표 토크)</label></PracticeHelp>
            <ReviewInput id={`${fieldId}-torque`} value={draft.torque} inputMode="decimal" maxLength={12} placeholder="작업지시서의 숫자만 입력"
              aria-invalid={!!draft.torque && !torqueReady} onChange={(event) => onChange({ ...draft, torque: event.target.value, exampleTorque: false })} />
          </FieldGroup>
          <ActionButton onClick={() => onChange({ ...draft, torque: '1.0', exampleTorque: true })}>교육용 예시값 1.0 쓰기</ActionButton>
          <Muted>{draft.exampleTorque ? '1.0 N·m은 화면 동작을 확인하는 예시값입니다.'
            : draft.torque && !torqueReady ? '0보다 큰 숫자를 입력하세요. 소수점은 점(.)을 쓰세요.' : '실제 교육에는 작업지시서의 N·m 값을 입력하세요.'}</Muted>
        </>}
        <ReadyPanel aria-label="실습 시작 준비">
          <strong>현재 단계 준비 · {checklist.filter((item) => item.done).length} / {checklist.length}</strong>
          <Checklist>{checklist.map(({ label, done }) => <CheckItem key={label} $done={done}>
            <span aria-hidden="true">{done ? '✓' : '○'}</span> {label} <Muted>{done ? '완료' : '대기'}</Muted>
          </CheckItem>)}</Checklist>
          <Muted role="status">{nextAction || (canStart ? '모든 단계가 준비됐습니다.' : '다른 단계의 설정도 마쳐 주세요.')}</Muted>
        </ReadyPanel>
        {notice && <Muted role="status">{notice}</Muted>}
        <ActionButton $primary disabled={!canStart} onClick={start}>저장하고 웹 실습 시작</ActionButton>
      </Panel>
    </Workspace>
  );
}

const Status = styled.div(({ theme }) => ({ padding: theme.space[2], background: theme.color.primaryFill, fontSize: theme.size.sm }));
const Sequence = styled(ScrollArea)(({ theme }) => ({
  display: 'flex', gap: theme.space[2], overflowX: 'auto', paddingBottom: theme.space[1],
  '& button': { flexShrink: 0, maxWidth: 'min(220px, 78%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
}));
const PartList = styled(ScrollArea)(({ theme }) => ({ display: 'grid', gap: theme.space[1], maxHeight: 164 }));
const FieldGroup = styled.div(({ theme }) => ({ display: 'grid', gap: theme.space[1], fontSize: theme.size.md, color: theme.color.inkSub }));
const ReadyPanel = styled.section(({ theme }) => ({
  display: 'grid', gap: theme.space[2], padding: theme.space[2], border: '1px solid ' + theme.color.primaryLineWeak,
  fontSize: theme.size.md,
}));
const Checklist = styled.ul(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(99px, 1fr))', gap: theme.space[1], padding: 0, margin: 0, listStyle: 'none',
}));
const CheckItem = styled.li<{ $done: boolean }>(({ theme, $done }) => ({
  color: $done ? theme.color.primarySoft : theme.color.inkSub, fontSize: theme.size.sm,
}));
const PartButton = styled.button(({ theme }) => ({
  textAlign: 'left', overflowWrap: 'anywhere', padding: theme.space[2], color: theme.color.ink, font: 'inherit',
  background: theme.color.panel, border: '1px solid ' + theme.color.primaryLineWeak,
  '&[aria-pressed=true]': { borderColor: theme.color.primary, background: theme.color.primaryFill },
  '&:disabled': { opacity: 0.45 },
}));
