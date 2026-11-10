import { useEffect, useId, useMemo, useRef, useState, type Dispatch, type DragEvent, type PointerEvent, type SetStateAction } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import type { StepAssemblyPart } from '@/features/drawing-upload-dev/model/stepAssemblyParts';
import type { StepModel } from '@/features/drawing-upload-dev/model/stepTypes';
import { ReviewInput, ReviewLabel, ReviewTextArea } from '@/features/drawing-upload-dev/review/reviewStyles';
import { ActionButton, Muted, ScrollArea } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { useDragAutoScroll } from '@/features/drawing-upload-dev/ui/useDragAutoScroll';
import { useModalDialog } from '@/features/drawing-upload-dev/ui/useModalDialog';
import { groupInstructions, moveInstruction, nextUnconfirmedInstruction, reorderInstruction, type AssemblyInstruction } from './assemblyInstructions';
import { AssemblyDrawingPreview, InstructionSheetPreview } from './InstructionSheetPreview';
import { InstructionAssemblyDetail } from './InstructionAssemblyDetail';
import { useStepDrawings } from './useStepDrawings';
import { StepPracticeWorkspace } from '../practice/StepPracticeWorkspace';
import { PracticeHelp } from '../practice/PracticeHelp';
import { isPracticeReady, type PracticeDraft } from '../practice/stepPracticeConfig';
import { createProductPracticeSequence } from '../practice/stepPracticeSequence';

const StepPracticePlayer = dynamic(() => import('../practice/StepPracticePlayer'), { ssr: false });
export type InstructionMode = 'edit' | 'detail' | 'preview' | 'drawing' | 'practice' | 'product-practice';
type UpdateInstructions = Dispatch<SetStateAction<AssemblyInstruction[]>>;

export function AssemblyInstructionsDialog({ mode, onMode, onClose, model, parts, selected, instructions, onChange, onSelectPart, practiceDraft, onPracticeChange }: {
  mode: InstructionMode; onMode: (mode: InstructionMode) => void; onClose: () => void;
  model: StepModel; parts: StepAssemblyPart[]; selected: StepAssemblyPart | null;
  instructions: AssemblyInstruction[]; onChange: UpdateInstructions; onSelectPart: (part: StepAssemblyPart) => void;
  practiceDraft: PracticeDraft; onPracticeChange: (draft: PracticeDraft) => void;
}) {
  const dialog = useModalDialog(onClose);
  const [detailStepId, setDetailStepId] = useState<string>();
  const confirmedCount = instructions.filter((step) => step.isConfirmed).length;
  const isDetailReady = instructions.length > 0 && confirmedCount === instructions.length;
  const title = { drawing: '교육용 도면', preview: '조립 순서 시트 미리보기', edit: '작업 단계 등록', detail: '조립 상세',
    practice: '실습 설정', 'product-practice': '제품 전체 실습' }[mode];
  return (
    <Modal {...dialog} $preview={mode !== 'edit'} $fullscreen={mode === 'product-practice'} aria-labelledby="assembly-instructions-title"
      onDragOver={(event) => event.stopPropagation()} onDrop={(event) => event.stopPropagation()}>
      <Header>
        <h2 id="assembly-instructions-title">{title}</h2>
        <Actions>
          {mode === 'edit' && <>
            <ActionButton onClick={() => onMode('detail')} disabled={!isDetailReady}>조립 상세로</ActionButton>
            {parts.length >= 2 && <ActionButton $primary onClick={() => onMode('product-practice')}>제품 전체 실습 시작</ActionButton>}
          </>}
          {mode === 'product-practice' && <ActionButton onClick={() => onMode('edit')}>순서 편집</ActionButton>}
          {mode === 'detail' && <>
            <ActionButton onClick={() => onMode('edit')}>단계 편집</ActionButton>
            <ActionButton onClick={() => onMode('preview')}>시트 미리보기</ActionButton>
            <ActionButton disabled={parts.length < 3} onClick={() => onMode('practice')}>실습 설정</ActionButton>
            <ActionButton $primary disabled={parts.length < 2} onClick={() => onMode('product-practice')}>제품 전체 실습</ActionButton>
          </>}
          {(mode === 'preview' || mode === 'practice' || mode === 'product-practice') && isDetailReady && <ActionButton onClick={() => onMode('detail')}>조립 상세로</ActionButton>}
          <ActionButton onClick={onClose}>닫기</ActionButton>
        </Actions>
      </Header>
      {mode === 'drawing' && <AssemblyDrawingPreview model={model} selected={selected} />}
      {mode === 'preview' && <InstructionSheetPreview model={model} parts={parts} instructions={instructions} />}
      {mode === 'practice' && <StepPracticeWorkspace model={model} parts={parts} instructions={instructions}
        draft={practiceDraft} onChange={onPracticeChange} />}
      {mode === 'product-practice' && <ProductPractice model={model} parts={parts} instructions={instructions} draft={practiceDraft} />}
      {mode === 'detail' && <InstructionAssemblyDetail model={model} parts={parts} instructions={instructions}
        activeId={detailStepId} onSelect={setDetailStepId}
        onCompare={(id, basePartNumber) => onChange((current) => current.map((step) => step.id === id ? { ...step, basePartNumber } : step))} />}
      {mode === 'edit' && <InstructionEditor model={model} parts={parts} selected={selected} instructions={instructions}
        confirmedCount={confirmedCount} onChange={onChange} onSelectPart={onSelectPart} onComplete={() => onMode('detail')} />}
    </Modal>
  );
}

function ProductPractice({ model, parts, instructions, draft }: {
  model: StepModel; parts: StepAssemblyPart[]; instructions: AssemblyInstruction[]; draft: PracticeDraft;
}) {
  const sequence = useMemo(() => createProductPracticeSequence(model, parts, instructions, isPracticeReady(draft, parts.length) ? draft : undefined),
    [model, parts, instructions, draft]);
  return <StepPracticePlayer model={model} parts={parts} instructions={instructions} sequence={sequence}
    notice="하위 조립품을 먼저 만들고, 본체 내부 부품을 장착한 뒤 덮개를 닫습니다." />;
}

function describePlacement(instructions: AssemblyInstruction[], id: string, parts: StepAssemblyPart[]) {
  for (const group of groupInstructions(instructions)) {
    const index = group.steps.findIndex((step) => step.id === id);
    if (index < 0) continue;
    const describe = (step: AssemblyInstruction, position: number) => {
      const part = parts[step.partNumber - 1];
      const number = `${group.number}-${position + 1}`;
      return { part, number, label: `${number} · ${part?.name ?? '부품'} #${step.partNumber}` };
    };
    const previous = group.steps[index - 1];
    const next = group.steps[index + 1];
    return { index,
      moving: describe(group.steps[index], index),
      previous: previous && describe(previous, index - 1),
      next: next && describe(next, index + 1),
    };
  }
}

function InstructionEditor({ model, parts, selected, instructions, confirmedCount, onChange, onSelectPart, onComplete }: {
  model: StepModel; parts: StepAssemblyPart[]; selected: StepAssemblyPart | null; instructions: AssemblyInstruction[];
  confirmedCount: number; onChange: UpdateInstructions; onSelectPart: (part: StepAssemblyPart) => void; onComplete: () => void;
}) {
  const [activeId, setActiveId] = useState(() => {
    const selectedStep = instructions.find((step) => step.partNumber === selected?.number);
    return (selectedStep ?? instructions.find((step) => !step.isConfirmed) ?? instructions[0])?.id;
  });
  const [drag, setDrag] = useState<{ id: string; section: string; height: number; target?: string; after?: boolean } | null>(null);
  const [movedId, setMovedId] = useState<string>();
  const [hoverPreview, setHoverPreview] = useState<{ part: StepAssemblyPart; left: number; top: number; width: number; height: number } | null>(null);
  const activeRow = useRef<HTMLButtonElement>(null);
  const editorGrid = useRef<HTMLDivElement>(null);
  const { trackDragScroll, stopDragScroll } = useDragAutoScroll(!!drag, editorGrid);
  const fieldId = useId();
  const groups = groupInstructions(instructions);
  const projectedOrder = drag?.target ? reorderInstruction(instructions, drag.id, drag.target, !!drag.after) : undefined;
  const placementOrder = drag ? projectedOrder : instructions;
  const placementId = drag ? drag.id : movedId;
  const placement = placementOrder && placementId ? describePlacement(placementOrder, placementId, parts) : undefined;
  const placementLabel = drag ? (projectedOrder === instructions ? '현재 위치' : '놓을 위치') : '이동 완료';
  const sourceIndex = drag ? groups.find((group) => group.name === drag.section)?.steps.findIndex((step) => step.id === drag.id) ?? -1 : -1;
  const dropIndex = drag ? placement?.index ?? sourceIndex : -1;
  const dropTarget = drag?.target;
  const draft = instructions.find((step) => step.id === activeId);
  const part = draft && parts[draft.partNumber - 1];
  const canConfirm = !!draft?.section.trim() && !!draft.description.trim();
  const hoveredPart = hoverPreview?.part;
  const movingPartNumber = drag ? instructions.find((step) => step.id === drag.id)?.partNumber : undefined;
  const movingPart = movingPartNumber === undefined ? placement?.moving.part : parts[movingPartNumber - 1];
  const previousPart = placement?.previous?.part;
  const nextPart = placement?.next?.part;
  const previewRequests = useMemo(() => [hoveredPart, movingPart, previousPart, nextPart].flatMap((target) => (
    target ? [{ key: String(target.number), target }] : []
  )), [hoveredPart, movingPart, previousPart, nextPart]);
  const previewImages = useStepDrawings(model, previewRequests);
  const hoverImage = hoveredPart && previewImages[String(hoveredPart.number)];

  useEffect(() => {
    activeRow.current?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  function finishDrag() {
    stopDragScroll();
    setDrag(null);
  }

  function showPartPreview(event: PointerEvent<HTMLButtonElement>, nextPart: StepAssemblyPart | undefined) {
    if (event.pointerType !== 'mouse' || drag || !nextPart) return;
    const row = event.currentTarget.getBoundingClientRect();
    const dialog = event.currentTarget.closest('dialog')?.getBoundingClientRect();
    if (!dialog) return;
    const spaceOnLeft = row.left - dialog.left - 24;
    const fitsLeft = spaceOnLeft >= 168;
    const width = Math.min(254, fitsLeft ? spaceOnLeft : dialog.width - 24);
    const height = Math.min(width * 0.67 + 42, dialog.height - 24);
    const desiredTop = fitsLeft ? row.top + (row.height - height) / 2 : row.top - height - 8;
    setHoverPreview({ part: nextPart, width, height,
      left: fitsLeft ? row.left - width - 12 : dialog.left + 12,
      top: Math.max(dialog.top + 12, Math.min(dialog.bottom - height - 12, desiredTop)),
    });
  }

  function selectStep(step: AssemblyInstruction) {
    setActiveId(step.id);
    setMovedId(undefined);
    const nextPart = parts[step.partNumber - 1];
    if (nextPart) onSelectPart(nextPart);
  }

  function updateDraft(patch: Partial<AssemblyInstruction>) {
    onChange((current) => current.map((step) => step.id === activeId ? { ...step, isConfirmed: false, ...patch } : step));
  }

  function setConfirmed(isConfirmed: boolean) {
    if (!draft || (isConfirmed && !canConfirm)) return;
    if (!isConfirmed) {
      updateDraft({ isConfirmed: false });
      return;
    }
    updateDraft({
      isConfirmed: true, section: draft.section.trim(), description: draft.description.trim(),
      tool: draft.tool.trim(), torque: draft.torque.trim(),
    });
    const next = nextUnconfirmedInstruction(groups.flatMap((group) => group.steps), draft.id);
    if (next) selectStep(next);
    else onComplete();
  }

  function clearDropTarget() {
    setDrag((current) => current?.target ? { ...current, target: undefined, after: undefined } : current);
  }

  function acceptDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
  }

  function commitDrop(targetId: string, after: boolean) {
    if (!drag) return;
    if (reorderInstruction(instructions, drag.id, targetId, after) !== instructions) {
      onChange((current) => reorderInstruction(current, drag.id, targetId, after));
      setMovedId(drag.id);
    }
    finishDrag();
  }

  function trackDrop(event: DragEvent<HTMLDivElement>, step: AssemblyInstruction, commit: boolean) {
    if (!drag || drag.id === step.id || drag.section !== step.section) return;
    acceptDrop(event);
    const bounds = event.currentTarget.getBoundingClientRect();
    const after = event.clientY >= bounds.top + bounds.height / 2;
    if (commit) {
      commitDrop(step.id, after);
    } else if (drag.target !== step.id || drag.after !== after) {
      setDrag({ ...drag, target: step.id, after });
    }
  }

  return (<>
    <EditorGrid ref={editorGrid} onScroll={() => setHoverPreview(null)}>
      <EditPane>
        {placement && <OrderPreview $dragging={!!drag} aria-label="조립 순서 미리보기">
          <strong>{placementLabel} · {placement.moving.number}</strong>
          <OrderSequence>
            {[
              { item: placement.previous, caption: '앞 부품', edge: '구간 시작' },
              { item: placement.moving, caption: '옮기는 부품', edge: '' },
              { item: placement.next, caption: '뒤 부품', edge: '구간 끝' },
            ].map(({ item, caption, edge }, index) => {
              const image = item?.part && previewImages[String(item.part.number)];
              return (
                <OrderTile key={caption} $moving={index === 1}>
                  <small>{item ? `${item.number} · ${caption}` : edge}</small>
                  {image ? <PartHoverImage src={image} alt={item?.part?.name} draggable={false} />
                    : <OrderPlaceholder>{item ? (image === undefined ? '이미지 준비 중' : '이미지 없음') : '—'}</OrderPlaceholder>}
                  <span title={item?.label}>{item?.part?.name ?? (item ? '부품' : '\u00a0')}</span>
                </OrderTile>
              );
            })}
          </OrderSequence>
        </OrderPreview>}
        <h3>작업 설명과 공구 확인</h3>
        {draft && part && (
          <StepFields>
            <Muted>STEP 부품명으로 만든 초안입니다. 작업 순서와 장착 방법, 공구·토크를 작업지시서와 대조해 주세요.</Muted>
            <SelectedPart aria-live="polite"><Muted>장착 부품 #{part.number}</Muted><strong>{part.name}</strong></SelectedPart>
            <ReviewLabel>구간 이름
              <ReviewInput required maxLength={30} value={draft.section}
                onChange={(event) => updateDraft({ section: event.target.value })} />
              <Muted>같은 이름을 쓰면 같은 구간에 배치됩니다.</Muted>
              <Muted>함께 미리 조립할 부품은 ‘기판 소조립’처럼 같은 구간 이름으로 확인해 주세요.</Muted>
            </ReviewLabel>
            <ReviewLabel>작업 설명
              <ReviewTextArea required maxLength={90} value={draft.description}
                onChange={(event) => updateDraft({ description: event.target.value })} />
            </ReviewLabel>
            <OptionalFields>
              <ReviewLabel as="div">
                <PracticeHelp topic="tool" above><label htmlFor={`${fieldId}-tool`}>공구 초안</label></PracticeHelp>
                <ReviewInput id={`${fieldId}-tool`} maxLength={24} value={draft.tool} placeholder="작업지시서 확인"
                  onChange={(event) => updateDraft({ tool: event.target.value })} />
              </ReviewLabel>
              <ReviewLabel as="div">
                <PracticeHelp topic="torque" above><label htmlFor={`${fieldId}-torque`}>조임 세기 초안 (토크)</label></PracticeHelp>
                <ReviewInput id={`${fieldId}-torque`} maxLength={24} value={draft.torque} placeholder="작업지시서의 값과 단위 입력"
                  onChange={(event) => updateDraft({ torque: event.target.value })} />
              </ReviewLabel>
            </OptionalFields>
            <HighlightOption>
              <input type="checkbox" checked={draft.isHighlighted} onChange={(event) => updateDraft({ isHighlighted: event.target.checked })} />
              시트에서 이 단계 강조
            </HighlightOption>
            <ConfirmOption>
              <input name="part-confirmed" type="checkbox" checked={draft.isConfirmed} disabled={!canConfirm}
                onChange={(event) => setConfirmed(event.target.checked)} />
              확인 완료
            </ConfirmOption>
            <Muted>모든 부품을 확인하면 조립 상세가 열립니다. 수정한 단계는 다시 확인해 주세요.</Muted>
          </StepFields>
        )}
      </EditPane>
      <QueueColumn>
        <h3 aria-live="polite">부품 확인 {confirmedCount} / {instructions.length}개</h3>
        <PlacementNotice role="status" $active={!!placement}>
          {placement ? <>
            <strong title={placement.moving.label}>{placementLabel} · {placement.moving.label}</strong>
            <span title={placement.previous?.label}>{placement.previous ? `앞 단계 · ${placement.previous.label}` : '구간의 첫 단계'}</span>
            {placement.next && <span title={placement.next.label}>뒤 단계 · {placement.next.label}</span>}
            {!placement.next && placement.previous && <span>구간의 마지막 단계</span>}
          </> : <span>{drag ? '목록 위·아래에 커서를 두면 자동으로 스크롤됩니다.' : '손잡이를 끌어 같은 구간에서 순서를 바꾸세요. 키보드로는 손잡이에서 ↑ 또는 ↓를 누르세요.'}</span>}
        </PlacementNotice>
        <QueueHint>제품 실습에서는 하위 조립품을 먼저 만들고 내부 조립 후 덮개를 닫습니다.</QueueHint>
        <QueueList onScroll={() => { if (!drag) setHoverPreview(null); }}
          onDragEnterCapture={trackDragScroll} onDragOverCapture={trackDragScroll} onDropCapture={stopDragScroll}
          onDragOver={clearDropTarget} onDragLeave={(event) => {
            if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX >= bounds.right || event.clientY < bounds.top || event.clientY >= bounds.bottom) {
              stopDragScroll();
              clearDropTarget();
            }
          }}>
          {groups.map((section) => (
            <InstructionGroup key={section.number}>
              <strong>구간 {section.number} · {section.name || '이름 미입력'}</strong>
              {section.steps.map((step, index) => {
                const number = section.number + '-' + (index + 1);
                const isDragSection = drag?.section === section.name;
                let shift = 0;
                if (isDragSection && index >= dropIndex && index < sourceIndex) shift = drag.height;
                if (isDragSection && index <= dropIndex && index > sourceIndex) shift = -drag.height;
                const hasSlot = isDragSection && index === dropIndex && dropIndex !== sourceIndex;
                return (
                  <DropZone key={step.id}
                    onDragOver={(event) => trackDrop(event, step, false)} onDrop={(event) => trackDrop(event, step, true)}>
                    <RegisteredStep $dragging={!!drag} $lifted={drag?.id === step.id && dropIndex !== sourceIndex} $shift={shift}>
                      <StepChoice ref={step.id === activeId ? activeRow : null} type="button"
                        aria-pressed={step.id === activeId} onClick={() => selectStep(step)}
                        onPointerEnter={(event) => showPartPreview(event, parts[step.partNumber - 1])}
                        onPointerLeave={() => setHoverPreview(null)} onPointerDown={() => setHoverPreview(null)}>
                        <strong>{number} · {parts[step.partNumber - 1]?.name} #{step.partNumber}</strong>
                        <StepStatus $confirmed={step.isConfirmed}>{step.isConfirmed ? '확인 완료' : '확인 대기'}</StepStatus>
                      </StepChoice>
                      <DragHandle type="button" draggable={section.steps.length > 1} disabled={section.steps.length < 2}
                        aria-label={`${parts[step.partNumber - 1]?.name} 순서 이동`} aria-keyshortcuts="ArrowUp ArrowDown"
                        onDragStart={(event) => {
                          const box = event.currentTarget.parentElement;
                          const zone = box?.parentElement;
                          if (!box || !zone) return;
                          const bounds = box.getBoundingClientRect();
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', step.id);
                          event.dataTransfer.setDragImage(box, event.clientX - bounds.left, event.clientY - bounds.top);
                          setHoverPreview(null);
                          setMovedId(undefined);
                          setDrag({ id: step.id, section: step.section, height: zone.offsetHeight });
                        }} onDragEnd={finishDrag}
                        onKeyDown={(event) => {
                          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                          event.preventDefault();
                          const direction = event.key === 'ArrowUp' ? -1 : 1;
                          if (moveInstruction(instructions, step.id, direction) !== instructions) {
                            onChange((current) => moveInstruction(current, step.id, direction));
                            setMovedId(step.id);
                          }
                        }}>
                        <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" aria-hidden="true">
                          {[5, 11].flatMap((x) => [4, 10, 16].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />))}
                        </svg>
                      </DragHandle>
                    </RegisteredStep>
                    {hasSlot && dropTarget && <DropSlot $after={dropIndex > sourceIndex} $height={drag.height}
                      aria-hidden="true" onDragOver={acceptDrop} onDrop={(event) => {
                        acceptDrop(event);
                        commitDrop(dropTarget, !!drag.after);
                      }}>여기에 놓기</DropSlot>}
                  </DropZone>
                );
              })}
            </InstructionGroup>
          ))}
        </QueueList>
      </QueueColumn>
    </EditorGrid>
    {hoverPreview && !drag && <PartHoverCard role="tooltip" style={{
      left: hoverPreview.left, top: hoverPreview.top, width: hoverPreview.width, height: hoverPreview.height,
    }}>
      <strong title={hoverPreview.part.name}>{hoverPreview.part.name}</strong>
      {hoverImage ? <PartHoverImage src={hoverImage} alt={hoverPreview.part.name + ' 부품 이미지'} />
        : <PartHoverStatus>{hoverImage === null ? '부품 이미지를 표시할 수 없습니다.' : '부품 이미지 준비 중'}</PartHoverStatus>}
    </PartHoverCard>}
  </>);
}

const Modal = styled.dialog<{ $preview: boolean; $fullscreen: boolean }>(({ theme, $preview, $fullscreen }) => ({
  width: $preview ? 'min(94vw, 1392px)' : 'min(94vw, 1160px)', maxWidth: 'none', maxHeight: '92vh',
  padding: 0, overflow: 'hidden', border: '1px solid ' + theme.color.primaryLine,
  background: theme.color.bgMid, color: theme.color.ink, fontFamily: theme.font.main,
  '&[open]': { display: 'flex', flexDirection: 'column' },
  '&::backdrop': { background: theme.color.panelStrong },
  ...($fullscreen ? { position: 'fixed', inset: 0, width: '100%', height: '100dvh', maxHeight: '100dvh', margin: 0, border: 0 } : {}),
}));
const Header = styled.header(({ theme }) => ({
  flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.space[4],
  padding: theme.space[4], borderBottom: '1px solid ' + theme.color.primaryLineWeak,
  '& h2': { margin: 0, fontSize: theme.size.xl },
}));
const Actions = styled.div(({ theme }) => ({
  display: 'flex', flexWrap: 'wrap', gap: theme.space[2], alignItems: 'center',
}));
const EditorGrid = styled(ScrollArea)(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: theme.space[4], padding: theme.space[4],
  '@media (max-width: 640px)': { gridTemplateColumns: '1fr' },
}));
const EditorColumn = styled.section(({ theme }) => ({
  minWidth: 0, padding: theme.space[4], background: theme.color.panel, border: '1px solid ' + theme.color.primaryLineWeak,
  '& h3': { margin: '0 0 ' + theme.space[3] + 'px', fontSize: theme.size.lg, color: theme.color.primarySoft },
}));
const EditPane = styled(EditorColumn)({ position: 'relative' });
const StepFields = styled.div(({ theme }) => ({ display: 'grid', gap: theme.space[3] }));
const SelectedPart = styled.div(({ theme }) => ({
  display: 'grid', gap: theme.space[1], padding: theme.space[3], background: theme.color.primaryFill, overflowWrap: 'anywhere',
}));
const OptionalFields = styled.div(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: theme.space[3],
}));
const HighlightOption = styled.label(({ theme }) => ({
  display: 'flex', alignItems: 'center', gap: theme.space[2], fontSize: theme.size.md,
  '& input': { accentColor: theme.color.primary },
}));
const ConfirmOption = styled(HighlightOption)(({ theme }) => ({
  padding: theme.space[3], background: theme.color.primaryFill, fontWeight: 700, cursor: 'pointer',
}));
const QueueColumn = styled(EditorColumn)({ display: 'flex', flexDirection: 'column', minHeight: 0 });
const QueueHint = styled(Muted)(({ theme }) => ({ marginBottom: theme.space[3] }));
const PlacementNotice = styled.div<{ $active: boolean }>(({ theme, $active }) => ({
  flexShrink: 0, boxSizing: 'border-box', height: 'calc(4.2em + 18px)', minWidth: 0, overflow: 'hidden',
  marginBottom: theme.space[3], padding: '8px', border: '1px solid ' + ($active ? theme.color.primaryLine : theme.color.primaryLineWeak),
  background: $active ? theme.color.primaryFill : undefined, color: theme.color.ink,
  fontSize: theme.size.sm, lineHeight: 1.4, overflowWrap: 'anywhere',
  '& strong': { color: theme.color.primarySoft },
  '& > *': { display: 'block', ...($active ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : {}) },
}));
const QueueList = styled(ScrollArea)({ maxHeight: 'min(55vh, 520px)' });
const PartHoverCard = styled.div(({ theme }) => ({
  position: 'fixed', zIndex: 4, pointerEvents: 'none', boxSizing: 'border-box',
  display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', gap: theme.space[2], padding: theme.space[2],
  background: theme.color.bgMid, color: theme.color.ink, border: '1px solid ' + theme.color.primaryLine,
  borderRadius: 8, boxShadow: '0 8px 26px #0009',
  '& strong': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: theme.size.md },
}));
const PartHoverImage = styled.img({
  display: 'block', width: '100%', height: '100%', minHeight: 0, objectFit: 'contain', background: '#f8f9fa', borderRadius: 4,
});
const PartHoverStatus = styled(Muted)({ display: 'grid', placeItems: 'center', textAlign: 'center' });
const OrderPreview = styled.aside<{ $dragging: boolean }>(({ theme, $dragging }) => ({
  boxSizing: 'border-box', display: 'grid', gap: theme.space[3], padding: theme.space[3], marginBottom: theme.space[4],
  background: theme.color.bgMid, border: '1px solid ' + theme.color.primaryLine, borderRadius: 8,
  '& > strong': { color: theme.color.primarySoft, fontSize: theme.size.md },
  ...($dragging ? {
    position: 'absolute', insetInline: theme.space[4], top: theme.space[4], zIndex: 3, pointerEvents: 'none', boxShadow: '0 8px 26px #0009',
    '@media (max-width: 640px)': { position: 'fixed', insetInline: '5vw', top: '12vh' },
  } : {}),
}));
const OrderSequence = styled.div(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'clamp(12px, 2vw, 28px)',
  '& > :not(:last-child)::after': {
    content: '"→"', position: 'absolute', insetInlineStart: 'calc(100% + 1px)', width: 'clamp(12px, 2vw, 28px)',
    top: '50%', transform: 'translateY(-50%)', textAlign: 'center', color: theme.color.primarySoft,
  },
}));
const OrderTile = styled.div<{ $moving: boolean }>(({ theme, $moving }) => ({
  position: 'relative', minWidth: 0, padding: theme.space[1], display: 'grid', gap: theme.space[1],
  gridTemplateRows: 'auto clamp(52px, 8vw, 120px) auto', textAlign: 'center',
  border: '1px solid ' + ($moving ? theme.color.primary : theme.color.primaryLineWeak), borderRadius: 5,
  background: $moving ? theme.color.primaryFill : theme.color.bgEdge,
  color: $moving ? theme.color.primarySoft : theme.color.ink,
  '& small, & span': { fontSize: theme.size.xs, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
}));
const OrderPlaceholder = styled(Muted)({ display: 'grid', placeItems: 'center', fontSize: 11 });
const InstructionGroup = styled.div(({ theme }) => ({
  display: 'grid', marginBottom: theme.space[4], fontSize: theme.size.md, overflowWrap: 'anywhere',
  '& > strong': { marginBottom: theme.space[1] },
}));
const DropZone = styled.div(({ theme }) => ({
  position: 'relative', minWidth: 0, paddingBlock: theme.space[1],
}));
const DropSlot = styled.div<{ $after: boolean; $height: number }>(({ theme, $after, $height }) => ({
  position: 'absolute', zIndex: 1, insetInline: 0, [$after ? 'bottom' : 'top']: theme.space[1],
  height: $height - theme.space[1] * 2, boxSizing: 'border-box', display: 'grid', placeItems: 'center',
  color: theme.color.primarySoft, background: theme.color.primaryFill, border: '2px dashed ' + theme.color.primary,
  fontSize: theme.size.sm, fontWeight: theme.weight.bold,
}));
const RegisteredStep = styled.div<{ $dragging: boolean; $lifted: boolean; $shift: number }>(({ theme, $dragging, $lifted, $shift }) => ({
  display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center',
  gap: theme.space[1], padding: theme.space[1], border: '1px solid ' + theme.color.primaryLineWeak, background: theme.color.bgMid,
  opacity: $lifted ? 0 : 1,
  transform: $shift ? `translateY(${$shift}px)` : undefined,
  pointerEvents: $dragging ? 'none' : undefined,
  transition: $dragging ? `transform ${theme.motion.fast} ${theme.motion.ease}` : undefined,
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
}));
const StepChoice = styled.button(({ theme }) => ({
  display: 'grid', gap: theme.space[1], textAlign: 'left', overflowWrap: 'anywhere', padding: theme.space[2],
  border: '1px solid transparent', background: 'transparent', color: theme.color.ink, font: 'inherit', cursor: 'pointer',
  '&[aria-pressed="true"]': { borderColor: theme.color.primary, background: theme.color.primaryFill },
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft },
}));
const StepStatus = styled(Muted)<{ $confirmed: boolean }>(({ theme, $confirmed }) => ({
  color: $confirmed ? theme.color.primarySoft : undefined,
}));
const DragHandle = styled(ActionButton)(({ theme }) => ({
  minHeight: theme.space[6], paddingInline: theme.space[2], color: theme.color.primarySoft, cursor: 'grab',
  '&:active:enabled': { cursor: 'grabbing' },
  '& svg': { pointerEvents: 'none' },
}));
