import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import styled from 'styled-components';
import type { StepAssemblyPart } from '@/features/drawing-upload-dev/model/stepAssemblyParts';
import type { StepModel } from '@/features/drawing-upload-dev/model/stepTypes';
import { ReviewInput, ReviewLabel, ReviewTextArea } from '@/features/drawing-upload-dev/review/reviewStyles';
import { ActionButton, Muted } from '@/features/drawing-upload-dev/ui/sharedStyles';
import { useModalDialog } from '@/features/drawing-upload-dev/ui/useModalDialog';
import { groupInstructions, moveInstruction, type AssemblyInstruction } from './assemblyInstructions';
import { AssemblyDrawingPreview, InstructionSheetPreview } from './InstructionSheetPreview';

export type InstructionMode = 'edit' | 'preview' | 'drawing';
type UpdateInstructions = Dispatch<SetStateAction<AssemblyInstruction[]>>;

export function AssemblyInstructionsDialog({ mode, onMode, onClose, model, parts, selected, instructions, onChange }: {
  mode: InstructionMode; onMode: (mode: InstructionMode) => void; onClose: () => void;
  model: StepModel; parts: StepAssemblyPart[]; selected: StepAssemblyPart | null;
  instructions: AssemblyInstruction[]; onChange: UpdateInstructions;
}) {
  const dialog = useModalDialog(onClose);
  const title = mode === 'drawing' ? '교육용 도면' : mode === 'preview' ? '조립 순서 시트 미리보기' : '작업 단계 등록';
  return (
    <Modal {...dialog} $preview={mode !== 'edit'} aria-labelledby="assembly-instructions-title">
      <Header>
        <h2 id="assembly-instructions-title">{title}</h2>
        <Actions>
          {mode === 'edit' && <ActionButton onClick={() => onMode('preview')} disabled={!instructions.length}>시트 미리보기</ActionButton>}
          {mode === 'preview' && <ActionButton onClick={() => onMode('edit')}>단계 편집</ActionButton>}
          <ActionButton onClick={onClose}>닫기</ActionButton>
        </Actions>
      </Header>
      {mode === 'drawing' && <AssemblyDrawingPreview model={model} selected={selected} />}
      {mode === 'preview' && <InstructionSheetPreview model={model} parts={parts} instructions={instructions} />}
      {mode === 'edit' && <InstructionEditor parts={parts} selected={selected} instructions={instructions} onChange={onChange} />}
    </Modal>
  );
}

function emptyDraft(part: StepAssemblyPart | null, section = '기본 조립'): AssemblyInstruction | null {
  return part ? {
    id: '', partNumber: part.number, section, description: '', tool: '', torque: '', isHighlighted: false,
  } : null;
}

function InstructionEditor({ parts, selected, instructions, onChange }: {
  parts: StepAssemblyPart[]; selected: StepAssemblyPart | null; instructions: AssemblyInstruction[]; onChange: UpdateInstructions;
}) {
  const [draft, setDraft] = useState(() => emptyDraft(selected, instructions.at(-1)?.section));
  const groups = groupInstructions(instructions);
  const getPartName = (number: number) => parts[number - 1]?.name ?? '부품 정보 없음';
  const updateDraft = (patch: Partial<AssemblyInstruction>) => setDraft((current) => current && { ...current, ...patch });

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft?.section.trim() || !draft.description.trim()) return;
    const step = {
      ...draft, id: draft.id || crypto.randomUUID(), section: draft.section.trim(),
      description: draft.description.trim(), tool: draft.tool.trim(), torque: draft.torque.trim(),
    };
    onChange((current) => draft.id ? current.map((item) => item.id === step.id ? step : item) : [...current, step]);
    setDraft(emptyDraft(selected, step.section));
  }

  function remove(id: string) {
    onChange((current) => current.filter((step) => step.id !== id));
    if (draft?.id === id) setDraft(emptyDraft(selected, draft.section));
  }

  return (
    <EditorGrid>
      <EditorColumn>
        <h3>{draft?.id ? '단계 수정' : '새 작업 단계'}</h3>
        {draft ? (
          <StepForm onSubmit={save}>
            <SelectedPart><Muted>대상 부품 #{draft.partNumber}</Muted><strong>{getPartName(draft.partNumber)}</strong></SelectedPart>
            <ReviewLabel>구간 이름
              <ReviewInput required maxLength={30} value={draft.section}
                onChange={(event) => updateDraft({ section: event.target.value })} />
              <Muted>같은 이름을 쓰면 같은 구간에 배치됩니다.</Muted>
            </ReviewLabel>
            <ReviewLabel>작업 설명
              <ReviewTextArea required maxLength={90} value={draft.description} placeholder="예: 커버를 지정된 위치에 올립니다."
                onChange={(event) => updateDraft({ description: event.target.value })} />
            </ReviewLabel>
            <OptionalFields>
              <ReviewLabel>공구 (선택)<ReviewInput maxLength={24} value={draft.tool} onChange={(event) => updateDraft({ tool: event.target.value })} /></ReviewLabel>
              <ReviewLabel>토크 (선택)<ReviewInput maxLength={24} value={draft.torque} onChange={(event) => updateDraft({ torque: event.target.value })} /></ReviewLabel>
            </OptionalFields>
            <HighlightOption><input type="checkbox" checked={draft.isHighlighted} onChange={(event) => updateDraft({ isHighlighted: event.target.checked })} />시트에서 이 단계 강조</HighlightOption>
            <Actions>
              <ActionButton type="submit" $primary disabled={!draft.section.trim() || !draft.description.trim()}>{draft.id ? '수정 적용' : '단계 추가'}</ActionButton>
              {draft.id && <ActionButton type="button" onClick={() => setDraft(emptyDraft(selected, draft.section))}>수정 취소</ActionButton>}
            </Actions>
          </StepForm>
        ) : <Muted>새 단계를 추가하려면 3D 화면에서 대상 부품을 먼저 선택하세요.</Muted>}
      </EditorColumn>
      <EditorColumn>
        <h3>등록한 단계 · {instructions.length}개</h3>
        {groups.map((section) => (
          <InstructionGroup key={section.number}>
            <strong>구간 {section.number} · {section.name}</strong>
            {section.steps.map((step, index) => {
              const number = `${section.number}-${index + 1}`;
              return (
                <RegisteredStep key={step.id}>
                  <strong>{number} · {getPartName(step.partNumber)}</strong>
                  <Muted>{step.description}</Muted>
                  <Actions>
                    <SmallButton aria-label={`${number} 단계 위로`} disabled={index === 0} onClick={() => onChange((current) => moveInstruction(current, step.id, -1))}>↑</SmallButton>
                    <SmallButton aria-label={`${number} 단계 아래로`} disabled={index === section.steps.length - 1} onClick={() => onChange((current) => moveInstruction(current, step.id, 1))}>↓</SmallButton>
                    <SmallButton aria-label={`${number} 단계 수정`} onClick={() => setDraft(step)}>수정</SmallButton>
                    <SmallButton aria-label={`${number} 단계 삭제`} onClick={() => remove(step.id)}>삭제</SmallButton>
                  </Actions>
                </RegisteredStep>
              );
            })}
          </InstructionGroup>
        ))}
        {!instructions.length && <Muted>단계를 추가하면 여기에 표시됩니다.</Muted>}
      </EditorColumn>
    </EditorGrid>
  );
}

const Modal = styled.dialog<{ $preview: boolean }>(({ theme, $preview }) => ({
  width: $preview ? 'min(94vw, 1392px)' : 'min(92vw, 960px)', maxWidth: 'none', maxHeight: '92vh',
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
  display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', minHeight: 0,
  overflow: 'auto', gap: theme.space[4], padding: theme.space[4],
  '@media (max-width: 640px)': { gridTemplateColumns: '1fr' },
}));
const EditorColumn = styled.section(({ theme }) => ({
  minWidth: 0, padding: theme.space[4], background: theme.color.panel, border: '1px solid ' + theme.color.primaryLineWeak,
  '& h3': { margin: '0 0 ' + theme.space[3] + 'px', fontSize: theme.size.lg, color: theme.color.primarySoft },
}));
const StepForm = styled.form(({ theme }) => ({ display: 'grid', gap: theme.space[3] }));
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
const InstructionGroup = styled.div(({ theme }) => ({
  display: 'grid', gap: theme.space[2], marginBottom: theme.space[4], fontSize: theme.size.md, overflowWrap: 'anywhere',
}));
const RegisteredStep = styled.div(({ theme }) => ({
  display: 'grid', gap: theme.space[1], padding: theme.space[3], border: '1px solid ' + theme.color.primaryLineWeak,
}));
const SmallButton = styled(ActionButton)(({ theme }) => ({
  minHeight: theme.space[6], paddingInline: theme.space[3], fontSize: theme.size.sm,
}));
