import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from 'react';
import styled from 'styled-components';
import type { StepAssemblyPart } from '@/features/drawing-upload-dev/model/stepAssemblyParts';
import type { StepModel } from '@/features/drawing-upload-dev/model/stepTypes';
import { ActionButton, Muted, ScrollArea } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { useDragAutoScroll } from '@/features/drawing-upload-dev/ui/useDragAutoScroll';
import { downloadFlangeFile } from '@/features/drawing-upload-dev/generate/flangePersistence';
import { angularDelta, displayedTorque } from '@/features/training-practice/assemblyMath';
import { AssemblySound } from '@/features/training-practice/assemblySound';
import type { AssemblyInstruction } from '../instructions/assemblyInstructions';
import { getInstructionFigureRequests, InstructionAssemblyFigures } from '../instructions/InstructionSheetPreview';
import { useStepDrawings } from '../instructions/useStepDrawings';
import { getPracticeInstalledParts, getProductPlacementCaption, moveProductPracticeStage, type PracticeSequence, type PracticeStage } from './stepPracticeSequence';
import { StepPracticeOverview, StepPracticeScene, type PracticePhase } from './StepPracticeScene';
import { advancePracticeTurn, getPracticeResistance, type TrayPlacementIssue } from './stepPracticeMotion';
import { PracticeHelp } from './PracticeHelp';
import { PracticeSubtitle } from './PracticeSubtitle';
import { PracticeCardEditor } from './PracticeCardEditor';
import { getPracticeCardImageRequests } from './practiceCardFigures';
import type { PracticeCardControls } from './PracticeSceneCards';
import { PRACTICE_STAGE_CARD_LIMIT, type PracticeSceneCard, type PracticeStageCards } from './practiceTrayLayout';
import { Panel, Toolbar, Viewport, Workspace } from './stepPracticeStyles';
import { usePracticeTrayLayout } from './usePracticeTrayLayout';

const guide = {
  place: '오른쪽 부품의 A를 중앙에서 화살표가 가리키는 결합 위치에 맞추세요.',
  insert: '오른쪽 볼트를 잡아 중앙의 화살표가 가리키는 위치에 놓으세요.',
  seat: '부품이 맞물리는 방향을 확인하세요.',
  tool: '체결 위치 옆에서 공구 가져오기를 누르세요.',
  turn: '왼쪽 버튼을 누른 채 원을 따라 시계 방향으로 돌리세요. ‘목표 도달’이 뜨면 놓으세요.',
  done: '조립 실습을 완료했습니다.',
};

const trayPlacementGuide: Record<TrayPlacementIssue, string> = {
  occupied: '다른 부품의 배치와 겹칩니다.',
  outside: '준비 구역 안에 놓아 주세요.',
};
const emptyCards: PracticeStageCards = {};
const lockedOrder = '완료·장착 중인 단계와 조립 선후관계는 유지해야 합니다.';
const stageKey = (stage: PracticeStage) => `${stage.workArea?.id ?? 'product'}-${stage.kind}-${stage.target.partNumber}`;

export default function StepPracticePlayer({ model, parts, instructions, sequence: initialSequence, notice, onSetup }: {
  model: StepModel; parts: StepAssemblyPart[]; instructions: AssemblyInstruction[]; sequence: PracticeSequence;
  notice: string; onSetup?: () => void;
}) {
  const [reorderedSequence, setReorderedSequence] = useState<PracticeSequence>();
  const sequence = reorderedSequence ?? initialSequence;
  const [phase, setPhase] = useState<PracticePhase>('place');
  const [showWireframe, setShowWireframe] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [showComparison, setShowComparison] = useState(false);
  const [message, setMessage] = useState('');
  const [exportingLesson, setExportingLesson] = useState(false);
  const [lessonExportStatus, setLessonExportStatus] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [offscreenStage, setOffscreenStage] = useState<number | null>(null);
  const [cardEditor, setCardEditor] = useState<{ key: string; id: string; existing: boolean; initial: PracticeSceneCard } | null>(null);
  const [pickupRequest, setPickupRequest] = useState<{ stage: number; revision: number } | null>(null);
  const [turn, setTurn] = useState({ progress: 0, rotation: 0, excess: 0 });
  const [orderDrag, setOrderDrag] = useState<{ from: number; height: number; to?: number; blocked?: boolean } | null>(null);
  const [orderNotice, setOrderNotice] = useState('');
  const turnRef = useRef(turn);
  const gesture = useRef<{ id: number; x: number; y: number; previous: number } | null>(null);
  const sound = useRef<AssemblySound | null>(null);
  const lastResistanceSound = useRef(0);
  const stageList = useRef<HTMLDivElement>(null);
  const progressPanel = useRef<HTMLElement>(null);
  const activeRow = useRef<HTMLDivElement>(null);
  const toolRing = useRef<HTMLDivElement>(null);
  const cardControls = useRef<PracticeCardControls>(null);
  const reportPartVisibility = useCallback((index: number, visible: boolean) => {
    setOffscreenStage((current) => visible ? (current === index ? null : current) : index);
  }, []);
  const isProduct = sequence.initialPart === undefined;
  const [preparing, setPreparing] = useState(isProduct);
  const firstArea = sequence.stages[0]?.workArea?.id ?? null;
  const [preparationArea, setPreparationArea] = useState(firstArea);
  const [trayPlacementIssue, setTrayPlacementIssue] = useState<TrayPlacementIssue | null>(null);
  const trayLayout = usePracticeTrayLayout(model.manifest.sha256, isProduct);
  const totalSteps = sequence.stages.length;
  const stage = sequence.stages[completedCount];
  const mount = stage?.kind === 'mount' ? stage : null;
  const join = stage?.kind === 'join' ? stage : null;
  const fasten = stage?.kind === 'fasten' ? stage : null;
  const showFasteningControls = !preparing && fasten !== null && (phase === 'tool' || phase === 'turn');
  const targetTorque = fasten?.torque ?? 0;
  const actualTorque = targetTorque * (displayedTorque(turn.progress) / 12 + turn.excess / 3);
  const resistance = getPracticeResistance(turn.progress);
  const isOver = turn.excess > 0.45;
  const isSeating = turn.progress >= 0.76 && turn.progress < 1;
  const turnStatus = isOver ? '토크 초과 · 다시 체결하세요.'
    : turn.progress === 1 ? '목표 도달 · 공구를 놓으세요.'
      : isSeating ? '마무리 체결 · 천천히 돌리세요.' : '';
  const active = stage ? parts[stage.target.partNumber - 1] : null;
  const activeParts = useMemo(() => join ? join.members.map((number) => parts[number - 1]) : active ? [active] : [], [join, active, parts]);
  const support = mount?.support ? parts[mount.support.partNumber - 1] : null;
  const workArea = preparing ? preparationArea : stage?.workArea?.id ?? null;
  const preparationAreas = useMemo(() => [...new Map(sequence.stages.map((step) => [step.workArea?.id ?? null,
    step.workArea?.name ?? '제품 조립'])).entries()], [sequence]);
  const trayItems = useMemo(() => sequence.stages.flatMap((step, index) => {
    if ((step.workArea?.id ?? null) !== workArea) return [];
    const numbers = step.kind === 'join' ? step.members : [step.target.partNumber];
    const key = step.kind === 'join' ? `group-${[...numbers].sort((a, b) => a - b).join('-')}` : `part-${numbers[0]}`;
    return [{ index, key, parts: numbers.map((number) => parts[number - 1]) }];
  }).sort((a, b) => a.parts[0].number - b.parts[0].number), [sequence, parts, workArea]);
  const trayKey = useMemo(() => workArea === null ? 'product' : `area-${[...new Set(trayItems.flatMap(({ parts }) => parts.map(({ number }) => number)))]
    .sort((a, b) => a - b).join('-')}`, [trayItems, workArea]);
  const waitingCount = trayItems.filter(({ index }) => index >= completedCount).length;
  const canEditTray = isProduct && (phase === 'place' || phase === 'insert');
  const trayEditing = trayLayout.status === 'ready' && (preparing || trayLayout.editing);
  const activePickup = pickupRequest?.stage === completedCount ? pickupRequest.revision : undefined;
  const showPickupQueue = !preparing && !trayEditing && (phase === 'place' || phase === 'insert') &&
    (offscreenStage === completedCount || activePickup !== undefined);
  const installed = useMemo(() => getPracticeInstalledParts(sequence, completedCount, workArea).map((number) => parts[number - 1]),
    [sequence, completedCount, workArea, parts]);
  const showCompleteWireframe = showWireframe && phase === 'done' && isProduct;
  const wireParts = useMemo(() => {
    if (!showWireframe || preparing) return [];
    if (showCompleteWireframe) return installed;
    const occupied = new Set([...installed, ...activeParts].map((part) => part.number));
    const upcoming = new Set(sequence.stages.slice(completedCount + 1)
      .filter((step) => (step.workArea?.id ?? null) === workArea)
      .flatMap((step) => step.kind === 'join' ? step.members : [step.target.partNumber]));
    return parts.filter(({ number }) => !occupied.has(number) && (!isProduct || upcoming.has(number)));
  }, [showWireframe, preparing, showCompleteWireframe, installed, activeParts, parts, sequence, completedCount, workArea, isProduct]);
  const instruction = join ? undefined : instructions.find((step) => step.partNumber === active?.number);
  const description = (!isProduct || instruction?.isConfirmed) ? instruction?.description : undefined;
  const isPlacement = phase === 'place' || phase === 'insert';
  const partName = join?.name ?? active?.name;
  const placementCaption = isPlacement && stage && partName ? getProductPlacementCaption(stage, partName, activePickup !== undefined) : undefined;
  const guidance = activePickup !== undefined && placementCaption ? placementCaption
    : phase === 'seat' ? guide.seat
    : join ? '오른쪽 주황색 칸의 완성된 묶음을 잡아 중앙 윤곽에 맞추세요.'
    : mount && !support ? (mount.closesEnclosure ? '오른쪽 덮개를 잡아 본체의 주황색 윤곽에 맞춰 닫으세요.' : '오른쪽 부품을 잡아 중앙 주황색 윤곽에 맞추세요.')
      : guide[phase];
  const helpTopic = phase === 'place' && support ? 'attach' : phase === 'turn' ? 'turn' : phase === 'tool' ? 'tool' : 'drag';
  const showProductCaption = isProduct && !preparing && !trayEditing;
  const firstEditable = completedCount + Number(!preparing && !isPlacement);
  const canMoveStage = useMemo(() => isProduct ? sequence.stages.map((_, index) => (
    !!moveProductPracticeStage(sequence, index, index - 1, firstEditable) || !!moveProductPracticeStage(sequence, index, index + 1, firstEditable)
  )) : [], [isProduct, sequence, firstEditable]);
  const { trackDragScroll, stopDragScroll } = useDragAutoScroll(!!orderDrag, progressPanel);
  const currentStageKey = trayItems.find(({ index }) => index === completedCount)?.key;
  const captionKey = isPlacement ? currentStageKey : undefined;
  const cardsKey = showProductCaption ? currentStageKey : undefined;
  const stageCards = cardsKey ? trayLayout.cards[cardsKey] ?? emptyCards : emptyCards;
  const activeCardEditor = cardsKey && cardEditor?.key === cardsKey ? cardEditor : null;
  const needsCardImages = !!activeCardEditor || Object.values(stageCards).some(({ image }) => image?.kind === 'during' || image?.kind === 'after');
  const cardImageRequests = useMemo(() => cardsKey && needsCardImages
    ? getPracticeCardImageRequests(cardsKey, activeParts, installed) : [], [cardsKey, needsCardImages, activeParts, installed]);
  const cardImages = useStepDrawings(model, cardImageRequests, 1.5);
  const cardFigures = { during: cardImages[`${cardsKey}-during`], after: cardImages[`${cardsKey}-after`] };
  const customCaption = captionKey ? trayLayout.captions[captionKey] : undefined;
  const defaultCaption = placementCaption ?? (phase === 'turn' ? turnStatus || guidance : message || guidance);

  async function startPractice() {
    if (trayLayout.editing && !await trayLayout.save()) return;
    setPreparing(false);
  }

  async function downloadLesson() {
    setExportingLesson(true);
    setLessonExportStatus('');
    try {
      const { exportPracticeVrLesson } = await import('./exportPracticeVrLesson');
      const archive = await exportPracticeVrLesson(model, parts, sequence, instructions, trayLayout, `0.1.${Math.floor(Date.now() / 1000)}`);
      downloadFlangeFile(archive.blob, archive.filename);
      setLessonExportStatus('Quest 연동용 교육 ZIP을 만들었습니다.');
    } catch (reason) {
      setLessonExportStatus(reason instanceof Error ? reason.message : '교육 ZIP을 만들지 못했습니다.');
    } finally { setExportingLesson(false); }
  }

  useEffect(() => () => { sound.current?.dispose(); sound.current = null; }, []);
  useEffect(() => {
    if (phase === 'turn') toolRing.current?.focus({ preventScroll: true });
  }, [phase]);
  useEffect(() => {
    const list = stageList.current, row = activeRow.current;
    if (!list || !row) return;
    const bounds = list.getBoundingClientRect(), current = row.getBoundingClientRect();
    if (current.bottom > bounds.bottom) list.scrollTop += current.bottom - bounds.bottom;
    else if (current.top < bounds.top) list.scrollTop -= bounds.top - current.top;
  }, [completedCount, preparing]);

  const resetTurn = useCallback(() => {
    gesture.current = null;
    const initial = { progress: 0, rotation: 0, excess: 0 };
    turnRef.current = initial;
    setTurn(initial);
    lastResistanceSound.current = 0;
    setMessage('');
  }, []);

  function endOrderDrag() {
    stopDragScroll();
    setOrderDrag(null);
  }

  function applyOrder(from: number, to: number) {
    const next = moveProductPracticeStage(sequence, from, to, firstEditable);
    if (!next) setOrderNotice(lockedOrder);
    else if (next !== sequence) {
      setReorderedSequence(next);
      setOrderNotice(`${from + 1}단계를 ${to + 1}단계로 옮겼습니다.`);
      const nextStage = next.stages[completedCount];
      if (nextStage !== stage) {
        resetTurn();
        setPickupRequest(null);
        setOffscreenStage(null);
        setShowComparison(false);
        setPhase(nextStage.kind === 'fasten' ? 'insert' : 'place');
      }
    }
    endOrderDrag();
  }

  function acceptOrderDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
  }

  function trackOrderDrop(event: DragEvent<HTMLDivElement>, index: number, commit: boolean) {
    if (!orderDrag) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const boundary = index + Number(event.clientY >= bounds.top + bounds.height / 2);
    const to = boundary - Number(orderDrag.from < boundary);
    const allowed = !!moveProductPracticeStage(sequence, orderDrag.from, to, firstEditable);
    if (allowed) acceptOrderDrop(event);
    else {
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'none';
    }
    if (commit) applyOrder(orderDrag.from, to);
    else if (orderDrag.to !== (allowed ? to : undefined) || !!orderDrag.blocked === allowed) {
      setOrderDrag({ ...orderDrag, to: allowed ? to : undefined, blocked: !allowed });
    }
  }

  const advanceStage = useCallback(() => {
    const next = completedCount + 1;
    const nextStage = sequence.stages[next];
    resetTurn();
    setCompletedCount(next);
    setShowComparison(false);
    setPhase(nextStage ? (nextStage.kind === 'fasten' ? 'insert' : 'place') : 'done');
    setMessage(nextStage ? `${next}단계 완료 · ${next + 1}단계를 진행하세요.` : guide.done);
  }, [completedCount, resetTurn, sequence]);

  function seated() {
    if (fasten) {
      setMessage('볼트 삽입 완료 · 공구를 가져오세요.');
      setPhase('tool');
    } else advanceStage();
  }

  function drop(matched: boolean) {
    if (!matched) {
      setMessage(phase === 'place' ? (support ? '부품의 A를 화살표 끝이 가리키는 곳에 맞춰 놓으세요.' : '부품을 주황색 윤곽에 맞춰 놓으세요.')
        : '볼트가 준비 구역으로 돌아갔습니다. 주황색 체결 위치에 놓으세요.');
      return;
    }
    if (phase === 'place' || phase === 'insert') {
      setMessage(phase === 'insert' ? '볼트 삽입 중' : '부품 결합 중');
      setPhase('seat');
    }
  }

  function rotate(delta: number) {
    const current = turnRef.current;
    if (delta <= 0 || current.excess > 0.45) return;
    const motion = advancePracticeTurn(current.progress, delta);
    const next = {
      progress: motion.progress,
      rotation: current.rotation + motion.rotation,
      excess: current.progress === 1 ? current.excess + delta : 0,
    };
    turnRef.current = next;
    setTurn(next);
    if (next.excess > 0.45) sound.current?.play('err');
    else if (current.progress < 1 && next.progress === 1) sound.current?.play('click');
    else if (next.progress >= 0.76 && next.progress < 1) {
      const now = performance.now();
      if (now - lastResistanceSound.current >= 85) {
        sound.current?.play('heavy');
        lastResistanceSound.current = now;
      }
    }
  }

  function completeTurn() {
    const current = turnRef.current;
    if (current.excess > 0.45) { setMessage('목표 토크를 초과했습니다. 다시 체결하세요.'); return; }
    if (current.progress < 1) return;
    advanceStage();
  }

  function startTurn(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || gesture.current || isOver) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2, y = bounds.top + bounds.height / 2;
    if (Math.hypot(event.clientX - x, event.clientY - y) < 16) return;
    gesture.current = { id: event.pointerId, x, y, previous: Math.atan2(event.clientY - y, event.clientX - x) };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveTurn(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId || Math.hypot(event.clientX - current.x, event.clientY - current.y) < 16) return;
    const angle = Math.atan2(event.clientY - current.y, event.clientX - current.x);
    rotate(angularDelta(angle, current.previous));
    current.previous = angle;
  }

  function finishGesture(event: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancelled) completeTurn();
  }

  return (
    <Workspace $product={isProduct}>
      {isProduct && <OverviewPanel aria-label="제품 조립 미리보기">
        <h3>제품 미리보기</h3>
        <OverviewLabel>조립 상태 <Muted>{installed.length}개 장착</Muted></OverviewLabel>
        <OverviewFrame role="region" aria-label="조립 상태">{installed.length > 0 ? <StepPracticeOverview model={model} parts={installed} /> : <Muted>장착하면 여기에 표시됩니다.</Muted>}</OverviewFrame>
        <OverviewLabel>완성품 <Muted>전체 {parts.length}개</Muted></OverviewLabel>
        <OverviewFrame role="region" aria-label="완성품"><StepPracticeOverview model={model} parts={parts} /></OverviewFrame>
      </OverviewPanel>}
      <MainPanel $product={isProduct}>
        <h3>{preparing ? '실습 전 준비 박스 배치' : '웹 조립 실습'}</h3>
        {isProduct && <strong>{preparing ? preparationAreas.find(([area]) => area === preparationArea)?.[1]
          : stage?.workArea ? `하위 조립 · ${stage.workArea.name}` : phase === 'done' ? '완성품' : '제품 조립'}</strong>}
        {preparing && preparationAreas.length > 1 && <AreaPicker role="group" aria-label="배치를 편집할 작업대">
          {preparationAreas.map(([area, label]) => <ActionButton key={area ?? 'product'} $primary={preparationArea === area}
            aria-pressed={preparationArea === area} disabled={trayLayout.saving} onClick={() => setPreparationArea(area)}>{label}</ActionButton>)}
        </AreaPicker>}
        {!showProductCaption && <GuidanceRow>{preparing || trayEditing ? <Muted>파란 손잡이로 박스 전체를 옮기세요. 부품을 오른쪽 빈 공간에 끌어 놓으면 박스를 가로로 늘릴 수 있습니다.</Muted> : phase === 'done' || phase === 'seat' ? <Muted>{guidance}</Muted> : (
          <PracticeHelp topic={helpTopic}>
            <Muted>{guidance}</Muted>
          </PracticeHelp>
        )}</GuidanceRow>}
        <ZoneLegend>
          <span>{preparing ? '중앙 · 조립 위치 미리보기' : '중앙 · 조립 작업대'}</span>
          <TrayToolbar>
            <span>{phase === 'done' ? '조립 완료' : `오른쪽 · 준비 박스 (부품 ${waitingCount}개)`}</span>
            {canEditTray && (trayEditing ? <>
              <ActionButton disabled={trayLayout.saving} onClick={() => trayLayout.resetTray(trayKey, trayItems.map(({ key }) => key))}>기본 배치</ActionButton>
              <ActionButton $primary={!preparing} disabled={trayLayout.saving || !trayLayout.editing} onClick={() => void trayLayout.save()}>배치 저장</ActionButton>
              {(!preparing || trayLayout.editing) && <ActionButton disabled={trayLayout.saving} onClick={trayLayout.cancel}>변경 취소</ActionButton>}
            </> : trayLayout.status === 'error' ? <ActionButton onClick={trayLayout.retry}>배치 다시 불러오기</ActionButton>
              : <ActionButton disabled={trayLayout.status === 'loading'} onClick={() => {
                setPickupRequest(null); trayLayout.begin();
              }}>준비 배치 편집</ActionButton>)}
            {preparing && <ActionButton $primary disabled={trayLayout.status === 'loading' || trayLayout.saving} onClick={() => void startPractice()}>
              {trayLayout.editing ? '저장하고 실습 시작' : '실습 시작'}
            </ActionButton>}
          </TrayToolbar>
        </ZoneLegend>
        <PracticeViewport $product={isProduct} $fastening={showFasteningControls} role="region" aria-label={preparing ? '시작 전 준비 박스 배치 3D' : '3D 조립 실습'}>
          <StepPracticeScene key={attempt} model={model} mountedParts={showCompleteWireframe ? [] : installed} wireParts={wireParts} wireGuide={showWireframe}
            trayItems={trayItems} stageIndex={completedCount} isSubassembly={workArea !== null} preparing={preparing} positions={trayLayout.positions}
            trayOffset={trayLayout.trayOffsets[trayKey]} movableTray={isProduct} wideTrayView={preparing || trayEditing}
            trayEdit={trayEditing && !trayLayout.saving ? {
              moveBox: (point) => trayLayout.moveTray(trayKey, point),
              movePart: (key, result) => {
                if (typeof result === 'string') trayLayout.setMessage(trayPlacementGuide[result]);
                else trayLayout.movePart(key, result);
              },
              onPlacementIssue: setTrayPlacementIssue,
            } : undefined}
            attachment={!preparing && stage && phase === 'place' ? { parts: activeParts, pick: stage.target.pick, support: mount?.support?.pick } : null}
            fastening={!preparing && fasten && active ? { part: active, head: fasten.target.pick, tool: fasten.tool } : null}
            seating={phase === 'seat' && stage ? { parts: activeParts, pick: mount?.support?.pick ?? stage.target.pick } : null}
            pickupRequest={activePickup} onSourceVisibilityChange={reportPartVisibility}
            cardSettings={cardsKey ? { key: cardsKey, cards: stageCards, controls: cardControls, figures: cardFigures,
              edit: (id, initial) => {
                if (phase === 'seat') return;
                const cardId = id ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16).padStart(8, '0')).join('');
                setCardEditor({ key: cardsKey, id: cardId, existing: id !== null, initial });
              },
              adjust: (id, geometry) => trayLayout.adjustCard(cardsKey, id, geometry) } : undefined}
            phase={phase} turn={turn} onDrop={drop} onSeated={seated} />
          {showPickupQueue && <PickupQueue aria-label="준비 부품 목록">
            <strong>준비 부품</strong>
            <Muted>{activePickup === undefined ? '이번에 조립할 부품을 가져오세요.' : '화면 위쪽의 주황색 테두리 안에서 부품을 집으세요.'}</Muted>
            <PickupList as="ol">
              {sequence.stages.slice(completedCount).map((item, position) => {
                const number = completedCount + position + 1;
                const name = item.kind === 'join' ? item.name : parts[item.target.partNumber - 1].name;
                return <PickupRow key={stageKey(item)} aria-current={position === 0 ? 'step' : undefined}>
                  <span><strong>{number}.</strong> {name}</span>
                  {position === 0 ? <ActionButton $primary onClick={() => setPickupRequest((previous) => ({
                    stage: completedCount, revision: (previous?.revision ?? 0) + 1,
                  }))}>{activePickup === undefined ? '가져오기' : '다시 가져오기'}</ActionButton> : <Muted>대기</Muted>}
                </PickupRow>;
              })}
            </PickupList>
          </PickupQueue>}
          {phase === 'seat' && <InspectBadge>{fasten ? '볼트 삽입 위치' : '부품 결합 위치'}</InspectBadge>}
          {trayEditing && !trayLayout.saving && trayPlacementIssue && <TrayPlacementWarning role="alert">
            놓을 수 없는 위치 · {trayPlacementGuide[trayPlacementIssue]}
          </TrayPlacementWarning>}
          {trayLayout.saving && <SaveOverlay role="status">배치 저장 중</SaveOverlay>}
          {canEditTray && trayLayout.status === 'loading' && <SaveOverlay role="status">저장된 준비 배치를 불러오는 중입니다.</SaveOverlay>}
          {showFasteningControls && <FasteningOverlay>
            {phase === 'turn' && <TurnRing ref={toolRing} role="group" aria-label="공구 회전 조작" tabIndex={0} $underLoad={isSeating}
              onPointerDown={startTurn} onPointerMove={moveTurn}
              onPointerUp={(event) => finishGesture(event, false)} onPointerCancel={(event) => finishGesture(event, true)}
              onLostPointerCapture={(event) => finishGesture(event, true)} onKeyDown={(event) => {
                if (event.key === 'ArrowRight') { event.preventDefault(); rotate(Math.PI / 12); }
                if (event.key === 'Enter') { event.preventDefault(); completeTurn(); }
              }} />}
            <FasteningCard aria-label="볼트 체결">
              <strong>볼트 체결</strong>
              <Muted>공구 · {fasten.tool}</Muted>
              <PracticeHelp topic="torque">
                <Muted>{fasten.exampleTorque ? '실습 예시 목표' : '목표 조임 세기'} · {targetTorque} N·m</Muted>
              </PracticeHelp>
              {phase === 'tool' ? <ActionButton $primary onClick={() => {
                resetTurn(); (sound.current ??= new AssemblySound()).play('seat'); setPhase('turn');
              }}>공구 가져오기</ActionButton> : <>
                <Gauge $warning={isOver} aria-live="off">{actualTorque.toFixed(2)} <small>N·m</small></Gauge>
                <Progress aria-label="목표 토크 도달률" max={1} value={turn.progress} />
                <ResistanceLabel>회전 저항 <strong>{Math.round(resistance * 100)}%</strong>
                  <progress aria-label="회전 저항" max={1} value={resistance} />
                </ResistanceLabel>
                <Muted>키보드는 오른쪽 화살표로 돌리고 Enter로 놓습니다.</Muted>
                {turnStatus && <TurnStatus role="status" $warning={isOver}>{turnStatus}</TurnStatus>}
                {isOver && <ActionButton onClick={() => { resetTurn(); toolRing.current?.focus({ preventScroll: true }); }}>다시 체결</ActionButton>}
              </>}
            </FasteningCard>
          </FasteningOverlay>}
          {showProductCaption && <PracticeSubtitle key={captionKey ?? phase} text={customCaption ?? defaultCaption}
            help={phase === 'done' || phase === 'seat' ? undefined : helpTopic}
            onSave={captionKey ? (text) => trayLayout.saveCaption(captionKey, text) : undefined} />}
        </PracticeViewport>
        {!preparing && <Toolbar>
          {cardsKey && <ActionButton disabled={phase === 'seat' || Object.keys(stageCards).length >= PRACTICE_STAGE_CARD_LIMIT}
            onClick={() => cardControls.current?.add()}>설명 카드 추가</ActionButton>}
          <ActionButton disabled={trayLayout.editing} $primary={showWireframe} aria-pressed={showWireframe} onClick={() => setShowWireframe((value) => !value)}>와이어프레임 보기</ActionButton>
          {onSetup && <ActionButton onClick={onSetup}>실습 설정으로</ActionButton>}
          <ActionButton disabled={trayLayout.editing} onClick={() => {
            resetTurn(); setAttempt((value) => value + 1); setCompletedCount(0); setShowComparison(false); setPhase('place');
            setOffscreenStage(null); setPickupRequest(null);
            setOrderNotice('');
            setPreparationArea(firstArea); setPreparing(isProduct);
          }}>처음부터 다시</ActionButton>
        </Toolbar>}
        {trayLayout.message && <Muted role="status">{trayLayout.message}</Muted>}
        {canEditTray && trayLayout.status === 'error' && <Muted role="status">저장된 준비 배치를 불러오지 못했습니다.</Muted>}
        {showCompleteWireframe ? <Muted>흰색 선 · 완성품 전체 구조</Muted>
          : showWireframe && !preparing && !trayLayout.editing && <Muted>{phase === 'tool' || phase === 'turn' ? '흰색 선 · 체결 중인 볼트의 구조' : '주황색 표시 · 이번 장착 위치'}
            {wireParts.length > 0 ? ' / 흰색 선 · 다음 장착 위치' : ''}</Muted>}
      </MainPanel>
      <ProgressPanel ref={progressPanel} $product={isProduct}>
        <h3 aria-live="polite">조립 진행 · {completedCount} / {totalSteps}</h3>
        {isProduct && <ActionButton disabled={exportingLesson || trayLayout.status !== 'ready' || totalSteps < 2}
          onClick={() => void downloadLesson()}>{exportingLesson ? '교육 ZIP 생성 중' : 'Quest 교육 내보내기'}</ActionButton>}
        {lessonExportStatus && <Muted role="status">{lessonExportStatus}</Muted>}
        <Progress aria-label="제품 조립 진행률" max={totalSteps} value={completedCount} />
        {isProduct && phase !== 'done' && <OrderHint role="status">{orderDrag?.blocked ? lockedOrder : orderNotice ||
          '손잡이를 끌어 남은 단계의 순서를 바꾸세요.'}</OrderHint>}
        <StageList ref={stageList} role="region" tabIndex={0} aria-label="실습 진행 순서"
          onDragEnterCapture={trackDragScroll} onDragOverCapture={trackDragScroll} onDropCapture={stopDragScroll}
          onDragLeave={(event) => {
            if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX >= bounds.right || event.clientY < bounds.top || event.clientY >= bounds.bottom) {
              stopDragScroll();
              setOrderDrag((current) => current ? { ...current, to: undefined, blocked: false } : current);
            }
          }}>
          {sequence.stages.map((item, index) => {
            const name = item.kind === 'join' ? `${item.name} · 결합` : parts[item.target.partNumber - 1].name;
            const current = !preparing && index === completedCount;
            const to = orderDrag?.to;
            let shift = 0;
            if (orderDrag && to !== undefined) {
              if (index >= to && index < orderDrag.from) shift = orderDrag.height;
              if (index <= to && index > orderDrag.from) shift = -orderDrag.height;
            }
            return <StageDropZone key={stageKey(item)} onDragOver={(event) => trackOrderDrop(event, index, false)}
              onDrop={(event) => trackOrderDrop(event, index, true)}>
              <Stage $active={current} $dragging={!!orderDrag} $shift={shift}
                $lifted={index === orderDrag?.from && to !== undefined && to !== index}
                ref={current ? activeRow : null} aria-current={current ? 'step' : undefined}>
                <StageNumber>{isProduct ? index + 1 : `1-${index + 1}`}</StageNumber>
                <span>{name}{item.kind === 'fasten' ? ' · 체결' : item.kind === 'mount' && item.closesEnclosure ? ' · 덮개 닫기' : ''}</span>
                <StageState>{index < completedCount ? '완료' : current ? '진행 중' : '대기'}</StageState>
                {canMoveStage[index] && <StageHandle type="button" draggable aria-label={`${index + 1}단계 ${name} 순서 이동`}
                  aria-keyshortcuts="ArrowUp ArrowDown" onDragStart={(event) => {
                    const row = event.currentTarget.parentElement;
                    const zone = row?.parentElement;
                    if (!row || !zone) return;
                    const bounds = row.getBoundingClientRect();
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', stageKey(item));
                    event.dataTransfer.setDragImage(row, event.clientX - bounds.left, event.clientY - bounds.top);
                    setOrderNotice('');
                    setOrderDrag({ from: index, height: zone.offsetHeight });
                  }} onDragEnd={endOrderDrag} onKeyDown={(event) => {
                    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                    event.preventDefault();
                    applyOrder(index, index + (event.key === 'ArrowUp' ? -1 : 1));
                  }}><span aria-hidden="true">⠿</span></StageHandle>}
              </Stage>
              {orderDrag && to === index && to !== orderDrag.from && <StageDropSlot $after={to > orderDrag.from} $height={orderDrag.height}
                onDragOver={acceptOrderDrop} onDrop={(event) => { acceptOrderDrop(event); applyOrder(orderDrag.from, to); }}
                aria-hidden="true">여기에 놓기</StageDropSlot>}
            </StageDropZone>;
          })}
        </StageList>
        {!preparing && <>
        {join ? <strong>{join.name} 결합 · {join.members.length}개 부품</strong> : active && <strong>#{active.number} {active.name}</strong>}
        {isProduct && mount && support && <ActionButton aria-expanded={showComparison} onClick={() => setShowComparison((value) => !value)}>
          {showComparison ? '장착 전후 그림 닫기' : '장착 전후 그림 보기'}
        </ActionButton>}
        {mount && active && support && (!isProduct || showComparison) && <MountingPreview key={active.number} model={model} part={active} base={support} installed={installed} purpose={mount.purpose} />}
        {!showProductCaption && description && <Muted>{description}</Muted>}
        {fasten && !showFasteningControls && <Muted>공구 · {fasten.tool}</Muted>}
        {!showProductCaption && !showFasteningControls && <Stage role="status" $active={phase === 'done'}>{message || guidance}</Stage>}
        </>}
        {notice && <Muted>{notice}</Muted>}
      </ProgressPanel>
      {activeCardEditor && <PracticeCardEditor key={activeCardEditor.id} initial={activeCardEditor.initial}
        figures={cardFigures} existing={activeCardEditor.existing}
        onSave={(card) => trayLayout.saveCard(activeCardEditor.key, activeCardEditor.id, card, activeCardEditor.existing)}
        onClose={() => setCardEditor(null)} />}
    </Workspace>
  );
}

function MountingPreview({ model, part, base, installed, purpose }: {
  model: StepModel; part: StepAssemblyPart; base: StepAssemblyPart; installed: StepAssemblyPart[]; purpose?: string;
}) {
  const requests = useMemo(() => getInstructionFigureRequests('practice-mount', part, base, installed.filter((item) => item !== base)), [part, base, installed]);
  const images = useStepDrawings(model, requests);
  return (
    <MountContext aria-label="장착 이유와 전후 모습">
      <Muted>받는 부품 · #{base.number} {base.name}</Muted>
      {purpose && <><strong>왜 여기 장착하나요?</strong><p>{purpose}</p></>}
      <InstructionAssemblyFigures stepId="practice-mount" part={part} base={base} images={images} />
    </MountContext>
  );
}

const Stage = styled.div<{ $active: boolean; $dragging?: boolean; $lifted?: boolean; $shift?: number }>(({ theme, $active, $dragging, $lifted, $shift }) => ({
  display: 'flex', alignItems: 'start', gap: theme.space[2], minWidth: 0, overflowWrap: 'anywhere',
  padding: theme.space[2], border: '1px solid ' + ($active ? theme.color.primary : theme.color.primaryLineWeak),
  background: $active ? theme.color.primaryFill : theme.color.bgMid, fontSize: theme.size.md,
  opacity: $lifted ? 0 : 1, transform: $shift ? `translateY(${$shift}px)` : undefined,
  pointerEvents: $dragging ? 'none' : undefined,
  transition: $dragging ? `transform ${theme.motion.fast} ${theme.motion.ease}` : undefined,
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
  '& > span:nth-child(2)': { flex: '1 1 0', minWidth: 0 },
}));
const StageDropZone = styled.div(({ theme }) => ({ position: 'relative', minWidth: 0, paddingBlock: theme.space[1] }));
const StageDropSlot = styled.div<{ $after: boolean; $height: number }>(({ theme, $after, $height }) => ({
  position: 'absolute', zIndex: 1, insetInline: 0, [$after ? 'bottom' : 'top']: theme.space[1],
  height: $height - 2 * theme.space[1], boxSizing: 'border-box', display: 'grid', placeItems: 'center',
  border: '1px dashed ' + theme.color.primary, background: theme.color.primaryFill, color: theme.color.primarySoft, fontSize: theme.size.sm,
}));
const StageHandle = styled(ActionButton)(({ theme }) => ({
  minHeight: 24, width: 24, flexShrink: 0, padding: 0, alignSelf: 'center', cursor: 'grab', color: theme.color.primarySoft,
  '&:active': { cursor: 'grabbing' }, '& span': { pointerEvents: 'none' },
}));
const OrderHint = styled(Muted)(({ theme }) => ({ minHeight: '2.8em', lineHeight: 1.4, fontSize: theme.size.sm }));
const StageNumber = styled.span(({ theme }) => ({ flexShrink: 0, minWidth: '2.6ch', color: theme.color.primarySoft, fontFamily: theme.font.mono }));
const StageState = styled(Muted)({ flexShrink: 0, marginLeft: 'auto', whiteSpace: 'nowrap' });
const Progress = styled.progress(({ theme }) => ({ width: '100%', accentColor: theme.color.primary }));
const MainPanel = styled(Panel)<{ $product: boolean }>(({ $product }) => $product ? { gridArea: 'scene', display: 'flex', flexDirection: 'column', alignSelf: 'stretch' } : {});
const ProgressPanel = styled(Panel)<{ $product: boolean }>(({ theme, $product }) => ({
  gridTemplateColumns: 'minmax(0, 1fr)', '& > *': { minWidth: 0, maxWidth: '100%' },
  ...($product ? {
    gridArea: 'progress', alignSelf: 'stretch', minHeight: 0, overflow: 'hidden auto',
    scrollbarWidth: 'thin', scrollbarColor: theme.color.primarySoft + ' ' + theme.color.bgMid,
    '&::-webkit-scrollbar:horizontal': { display: 'none' },
    '@media (max-width: 820px)': { overflow: 'clip visible' },
  } : {}),
}));
const PracticeViewport = styled(Viewport)<{ $product: boolean; $fastening: boolean }>(({ $product, $fastening }) => ({
  ...($product ? { flex: '1 1 0', minHeight: 'clamp(380px, 63dvh, 760px)' } : {}),
  ...($fastening ? { '@media (max-width: 1080px)': { minHeight: 'max(560px, 63dvh)' } } : {}),
}));
const AreaPicker = styled(Toolbar)(({ theme }) => ({
  maxHeight: 110, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: theme.color.primarySoft + ' ' + theme.color.bgMid,
  '& button': { minHeight: theme.space[6], paddingInline: theme.space[2], fontSize: theme.size.sm },
}));
const GuidanceRow = styled.div({ minHeight: 26 });
const OverviewPanel = styled(Panel)({ gridArea: 'overview' });
const OverviewLabel = styled.h4(({ theme }) => ({
  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: theme.space[1], margin: 0, fontSize: theme.size.md,
}));
const OverviewFrame = styled.div(({ theme }) => ({
  position: 'relative', minHeight: 128, aspectRatio: '1.82', display: 'grid', placeItems: 'center',
  textAlign: 'center', background: theme.color.bgMid, border: '1px solid ' + theme.color.primaryLineWeak,
  '@media (max-width: 820px)': { aspectRatio: '1.4' },
}));
const SaveOverlay = styled.div(({ theme }) => ({
  position: 'absolute', inset: 0, zIndex: 6, display: 'grid', placeItems: 'center', background: theme.color.panelStrong,
}));
const PickupQueue = styled.aside(({ theme }) => ({
  position: 'absolute', top: theme.space[3], right: theme.space[3], zIndex: 3,
  width: 'min(228px, 44%)', maxHeight: '54%', boxSizing: 'border-box',
  display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: 'auto auto minmax(0, 1fr)',
  gap: theme.space[2], padding: theme.space[3], overflowWrap: 'anywhere',
  background: theme.color.bgMid, border: '1px solid ' + theme.color.primaryLine, borderRadius: 8,
  boxShadow: '0 8px 24px #0007',
}));
const PickupList = styled(ScrollArea)(({ theme }) => ({
  display: 'grid', alignContent: 'start', gap: theme.space[1], margin: 0, padding: 0,
  listStyle: 'none', overflow: 'hidden auto', '&::-webkit-scrollbar:horizontal': { display: 'none' },
}));
const PickupRow = styled.li(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'start', gap: theme.space[1],
  fontSize: theme.size.sm, padding: theme.space[1],
  '&[aria-current=step]': { gridTemplateColumns: 'minmax(0, 1fr)', color: theme.color.primarySoft },
  '& button': { minHeight: theme.space[6], paddingInline: theme.space[2], fontSize: theme.size.sm },
}));
const InspectBadge = styled.span(({ theme }) => ({
  position: 'absolute', top: theme.space[3], left: theme.space[3], padding: `${theme.space[1]}px ${theme.space[2]}px`,
  background: theme.color.panelStrong, color: theme.color.primarySoft, fontSize: theme.size.sm, pointerEvents: 'none',
}));
const TrayPlacementWarning = styled(InspectBadge)(({ theme }) => ({
  zIndex: 4, maxWidth: `calc(100% - ${theme.space[3] * 2}px)`, fontWeight: 700,
  color: '#ff9da1', background: '#391b20', border: '1px solid #ed6269', borderRadius: 8,
}));
const MountContext = styled.section(({ theme }) => ({
  display: 'grid', gap: theme.space[2], padding: theme.space[2], border: '1px solid ' + theme.color.primaryLineWeak,
  '& p': { fontSize: theme.size.md, lineHeight: 1.55 },
}));
const StageList = styled(ScrollArea)({
  display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', maxHeight: 270, minWidth: 0, overflow: 'hidden auto',
  '&::-webkit-scrollbar:horizontal': { display: 'none' },
});
const Gauge = styled.strong<{ $warning: boolean }>(({ theme, $warning }) => ({
  color: $warning ? theme.color.danger : theme.color.primarySoft, fontFamily: theme.font.mono, fontSize: theme.size.xxl,
  '& small': { fontSize: theme.size.md },
}));
const FasteningOverlay = styled.div({
  position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', containerType: 'inline-size',
  '--turn-ring-size': 'clamp(90px, 18cqw, 180px)',
});
const FasteningCard = styled.section(({ theme }) => ({
  position: 'absolute', top: '50%', left: 'calc(50% + var(--turn-ring-size) / 2 + 12px)', transform: 'translateY(-50%)',
  width: 'min(264px, calc(50% - var(--turn-ring-size) / 2 - 24px))', boxSizing: 'border-box',
  display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: theme.space[2], padding: theme.space[3],
  pointerEvents: 'auto', overflowWrap: 'anywhere', background: theme.color.bgMid,
  border: '1px solid ' + theme.color.primaryLine, borderRadius: 8, boxShadow: '0 10px 32px #0008',
  '@container (max-width: 540px)': {
    top: 'calc(50% + var(--turn-ring-size) / 2 + 8px)', left: '50%', transform: 'translateX(-50%)',
    width: 'min(320px, calc(100% - 24px))', maxHeight: 'calc(50% - var(--turn-ring-size) / 2 - 16px)', overflowY: 'auto',
  },
}));
const TurnStatus = styled(Muted)<{ $warning: boolean }>(({ theme, $warning }) => ({
  color: $warning ? theme.color.danger : theme.color.primarySoft,
}));
const ZoneLegend = styled.div(({ theme }) => ({
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: theme.space[2],
  minHeight: theme.space[6], color: theme.color.inkMuted, fontSize: theme.size.sm,
  '& > span': { color: '#7ec9ff' },
}));
const TrayToolbar = styled(Toolbar)(({ theme }) => ({
  alignItems: 'center', justifyContent: 'flex-end', marginLeft: 'auto',
  '& > span': { color: theme.color.primarySoft },
  '& button': { minHeight: theme.space[6], paddingInline: theme.space[2], fontSize: theme.size.sm },
}));
const ResistanceLabel = styled.div(({ theme }) => ({
  display: 'grid', gridTemplateColumns: '1fr auto', gap: theme.space[1], color: theme.color.inkMuted, fontSize: theme.size.sm,
  '& progress': { gridColumn: '1 / -1', width: '100%', accentColor: theme.color.primary },
}));
const TurnRing = styled.div<{ $underLoad: boolean }>(({ theme, $underLoad }) => ({
  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'var(--turn-ring-size)', aspectRatio: 1,
  pointerEvents: 'auto',
  border: '2px dashed ' + ($underLoad ? theme.color.warning : theme.color.primary), borderRadius: '50%', cursor: 'grab', touchAction: 'none',
  '&:active': { cursor: 'grabbing' }, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft },
}));
