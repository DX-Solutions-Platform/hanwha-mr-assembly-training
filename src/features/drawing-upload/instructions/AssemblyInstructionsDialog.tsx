import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import styled from 'styled-components';
import type { StepAssemblyPart } from '@/features/drawing-upload-dev/model/stepAssemblyParts';
import type { StepModel } from '@/features/drawing-upload-dev/model/stepTypes';
import { ReviewInput, ReviewLabel, ReviewTextArea } from '@/features/drawing-upload-dev/review/reviewStyles';
import { ActionButton, Muted } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { useModalDialog } from '@/features/drawing-upload-dev/ui/useModalDialog';
import { groupInstructions, moveInstruction, nextUnconfirmedInstruction, type AssemblyInstruction } from './assemblyInstructions';
import { AssemblyDrawingPreview, InstructionSheetPreview } from './InstructionSheetPreview';
import { InstructionAssemblyDetail } from './InstructionAssemblyDetail';
import { StepPracticeWorkspace } from '../practice/StepPracticeWorkspace';
import type { PracticeDraft } from '../practice/stepPracticeConfig';

export type InstructionMode = 'edit' | 'detail' | 'preview' | 'drawing' | 'practice';
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
  const title = { drawing: '교육용 도면', preview: '조립 순서 시트 미리보기', edit: '작업 단계 등록', detail: '조립 상세', practice: '조립 실습' }[mode];
  return (
    <Modal {...dialog} $preview={mode !== 'edit'} aria-labelledby="assembly-instructions-title">
      <Header>
        <h2 id="assembly-instructions-title">{title}</h2>
        <Actions>
          {mode === 'edit' && <ActionButton onClick={() => onMode('detail')} disabled={!isDetailReady}>조립 상세로</ActionButton>}
          {mode === 'detail' && <>
            <ActionButton onClick={() => onMode('edit')}>단계 편집</ActionButton>
            <ActionButton onClick={() => onMode('preview')}>시트 미리보기</ActionButton>
            <ActionButton $primary disabled={parts.length < 2} onClick={() => onMode('practice')}>실습 설정</ActionButton>
          </>}
          {(mode === 'preview' || mode === 'practice') && <ActionButton disabled={!isDetailReady} onClick={() => onMode('detail')}>조립 상세로</ActionButton>}
          <ActionButton onClick={onClose}>닫기</ActionButton>
        </Actions>
      </Header>
      {mode === 'drawing' && <AssemblyDrawingPreview model={model} selected={selected} />}
      {mode === 'preview' && <InstructionSheetPreview model={model} parts={parts} instructions={instructions} />}
      {mode === 'practice' && <StepPracticeWorkspace model={model} parts={parts} instructions={instructions}
        draft={practiceDraft} onChange={onPracticeChange} />}
      {mode === 'detail' && <InstructionAssemblyDetail model={model} parts={parts} instructions={instructions}
        activeId={detailStepId} onSelect={setDetailStepId}
        onCompare={(id, basePartNumber) => onChange((current) => current.map((step) => step.id === id ? { ...step, basePartNumber } : step))} />}
      {mode === 'edit' && <InstructionEditor parts={parts} selected={selected} instructions={instructions}
        confirmedCount={confirmedCount} onChange={onChange} onSelectPart={onSelectPart} onComplete={() => onMode('detail')} />}
    </Modal>
  );
}

function InstructionEditor({ parts, selected, instructions, confirmedCount, onChange, onSelectPart, onComplete }: {
  parts: StepAssemblyPart[]; selected: StepAssemblyPart | null; instructions: AssemblyInstruction[];
  confirmedCount: number; onChange: UpdateInstructions; onSelectPart: (part: StepAssemblyPart) => void; onComplete: () => void;
}) {
  const [activeId, setActiveId] = useState(() => {
    const selectedStep = instructions.find((step) => step.partNumber === selected?.number);
    return (selectedStep ?? instructions.find((step) => !step.isConfirmed) ?? instructions[0])?.id;
  });
  const activeRow = useRef<HTMLButtonElement>(null);
  const groups = groupInstructions(instructions);
  const draft = instructions.find((step) => step.id === activeId);
  const part = draft && parts[draft.partNumber - 1];
  const canConfirm = !!draft?.section.trim() && !!draft.description.trim();

  useEffect(() => {
    activeRow.current?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  function selectStep(step: AssemblyInstruction) {
    setActiveId(step.id);
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

  return (
    <EditorGrid>
      <EditorColumn>
        <h3>작업 설명과 공구 확인</h3>
        {draft && part && (
          <StepFields>
            <Muted>STEP 부품명으로 만든 초안입니다. 작업 순서와 장착 방법, 공구·토크를 작업지시서와 대조해 주세요.</Muted>
            <SelectedPart aria-live="polite"><Muted>장착 부품 #{part.number}</Muted><strong>{part.name}</strong></SelectedPart>
            <ReviewLabel>구간 이름
              <ReviewInput required maxLength={30} value={draft.section}
                onChange={(event) => updateDraft({ section: event.target.value })} />
              <Muted>같은 이름을 쓰면 같은 구간에 배치됩니다.</Muted>
            </ReviewLabel>
            <ReviewLabel>작업 설명
              <ReviewTextArea required maxLength={90} value={draft.description}
                onChange={(event) => updateDraft({ description: event.target.value })} />
            </ReviewLabel>
            <OptionalFields>
              <ReviewLabel>공구 초안
                <ReviewInput maxLength={24} value={draft.tool} placeholder="작업지시서 확인"
                  onChange={(event) => updateDraft({ tool: event.target.value })} />
              </ReviewLabel>
              <ReviewLabel>토크 초안
                <ReviewInput maxLength={24} value={draft.torque} placeholder="작업지시서의 값과 단위 입력"
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
      </EditorColumn>
      <QueueColumn>
        <h3 aria-live="polite">부품 확인 {confirmedCount} / {instructions.length}개</h3>
        <QueueHint>목록에서 이번 단계의 장착 부품을 선택하세요.</QueueHint>
        <QueueList>
          {groups.map((section) => (
            <InstructionGroup key={section.number}>
              <strong>구간 {section.number} · {section.name || '이름 미입력'}</strong>
              {section.steps.map((step, index) => {
                const number = section.number + '-' + (index + 1);
                return (
                  <RegisteredStep key={step.id}>
                    <StepChoice ref={step.id === activeId ? activeRow : null} type="button"
                      aria-pressed={step.id === activeId} onClick={() => selectStep(step)}>
                      <strong>{number} · {parts[step.partNumber - 1]?.name} #{step.partNumber}</strong>
                      <StepStatus $confirmed={step.isConfirmed}>{step.isConfirmed ? '확인 완료' : '확인 대기'}</StepStatus>
                    </StepChoice>
                    <Actions>
                      <SmallButton aria-label={number + ' 단계 위로'} disabled={index === 0}
                        onClick={() => onChange((current) => moveInstruction(current, step.id, -1))}>↑</SmallButton>
                      <SmallButton aria-label={number + ' 단계 아래로'} disabled={index === section.steps.length - 1}
                        onClick={() => onChange((current) => moveInstruction(current, step.id, 1))}>↓</SmallButton>
                    </Actions>
                  </RegisteredStep>
                );
              })}
            </InstructionGroup>
          ))}
        </QueueList>
      </QueueColumn>
    </EditorGrid>
  );
}

const Modal = styled.dialog<{ $preview: boolean }>(({ theme, $preview }) => ({
  width: $preview ? 'min(94vw, 1392px)' : 'min(94vw, 1160px)', maxWidth: 'none', maxHeight: '92vh',
  padding: 0, border: '1px solid ' + theme.color.primaryLine,
  background: theme.color.bgMid, color: theme.color.ink, fontFamily: theme.font.main,
  '&[open]': { display: 'flex', flexDirection: 'column' },
  '&::backdrop': { background: theme.color.panelStrong },
}));
const Header = styled.header(({ theme }) => ({
  flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.space[4],
  padding: theme.space[4], borderBottom: '1px solid ' + theme.color.primaryLineWeak,
  '& h2': { margin: 0, fontSize: theme.size.xl },
}));
const Actions = styled.div(({ theme }) => ({
  display: 'flex', flexWrap: 'wrap', gap: theme.space[2], alignItems: 'center',
}));
const EditorGrid = styled.div(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', minHeight: 0,
  overflow: 'auto', gap: theme.space[4], padding: theme.space[4],
  '@media (max-width: 640px)': { gridTemplateColumns: '1fr' },
}));
const EditorColumn = styled.section(({ theme }) => ({
  minWidth: 0, padding: theme.space[4], background: theme.color.panel, border: '1px solid ' + theme.color.primaryLineWeak,
  '& h3': { margin: '0 0 ' + theme.space[3] + 'px', fontSize: theme.size.lg, color: theme.color.primarySoft },
}));
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
const QueueList = styled.div({ maxHeight: 'min(55vh, 520px)', overflowY: 'auto' });
const InstructionGroup = styled.div(({ theme }) => ({
  display: 'grid', gap: theme.space[2], marginBottom: theme.space[4], fontSize: theme.size.md, overflowWrap: 'anywhere',
}));
const RegisteredStep = styled.div(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center',
  gap: theme.space[1], padding: theme.space[1], border: '1px solid ' + theme.color.primaryLineWeak,
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
const SmallButton = styled(ActionButton)(({ theme }) => ({
  minHeight: theme.space[6], paddingInline: theme.space[3], fontSize: theme.size.sm,
}));
