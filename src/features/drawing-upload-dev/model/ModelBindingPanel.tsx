import styled from 'styled-components';
import type { usePartReview } from '../review/usePartReview';
import type { useStepModel } from './useStepModel';
import { sameStepModel, shapeLabel } from './stepModel';
import { StepShapeList } from './StepShapeList';
import { ActionButton, Muted, StateText } from '../ui/sharedStyles';
import { ReviewHeader, ReviewPanel, ReviewTitle } from '../review/reviewStyles';

export function ModelBindingPanel({ step, review, selectedKey }: {
  step: ReturnType<typeof useStepModel>; review: ReturnType<typeof usePartReview>; selectedKey: string | null;
}) {
  const current = review.current;
  const part = current?.partList.find((item) => item.key === selectedKey);
  const group = current?.groupList.find((item) => item.key === selectedKey);
  const manifest = step.model?.manifest ?? null;
  const matches = sameStepModel(current?.model ?? null, manifest);
  const needsReset = !!current?.modelLinks.length && !!manifest && !matches;
  const links = matches ? current?.modelLinks ?? [] : [];
  const selected = manifest?.shapeList.find((shape) => shape.id === step.selectedId);
  const owner = links.find((link) => link.shapeId === step.selectedId);
  const ownerGroup = current?.groupList.find((item) => item.key === owner?.partKey);
  const ownerPart = current?.partList.find((item) => item.key === owner?.partKey);
  const isBusy = step.status === 'running';
  return <ReviewPanel aria-label="3D 부품번호 연결">
    <ReviewHeader><ReviewTitle>부품번호 ↔ 3D 형상</ReviewTitle></ReviewHeader>
    <BindingInfo>
      {part && group ? <><SelectedPart>{group.partNumber || '부품번호 미기재'} · {part.name || '품명 미기재'}</SelectedPart><StateText $tone={part.status === 'confirmed' ? 'success' : 'warning'}>{part.status === 'confirmed' ? '검토 확정 · 연결 가능' : '부품 검토를 먼저 확정해 주세요.'}</StateText></> : <Muted>PDF를 분석하고 부품 검토를 확정하면 연결할 수 있습니다.</Muted>}
      {selected && <Muted>선택 형상: {shapeLabel(selected)} · 형상 {selected.meshIndex + 1}</Muted>}
      {owner && <StateText $tone={ownerPart?.status === 'confirmed' ? 'success' : 'warning'}>현재 연결: {ownerGroup?.partNumber || '부품번호 미기재'}{ownerPart?.status !== 'confirmed' && ' · 부품 재확정 필요'}</StateText>}
      {current?.model && !manifest && <Notice>저장된 연결 {current.modelLinks.length}건 · {current.model.name} 원본 STEP을 올리면 확인할 수 있습니다.</Notice>}
      {needsReset && <Notice role="status">저장된 연결은 다른 STEP 기준입니다. 같은 원본을 올리거나 새 모델로 다시 연결하세요.<ResetButton onClick={() => manifest && review.replaceModel(manifest)} disabled={isBusy}>현재 STEP으로 다시 시작 · 기존 {current!.modelLinks.length}건 연결 해제</ResetButton></Notice>}
      <Actions>
        <ActionButton $primary disabled={!manifest || !selected || !part || part.status !== 'confirmed' || !!owner || needsReset || isBusy} onClick={() => manifest && selected && part && review.bind(part.key, selected.id, manifest)}>{owner?.partKey === selectedKey ? '이미 연결됨' : '선택 형상 연결'}</ActionButton>
        <ActionButton disabled={!manifest || !owner || isBusy} onClick={() => manifest && step.selectedId && review.unbind(step.selectedId, manifest)}>연결 해제</ActionButton>
      </Actions>
      {part && matches && <Muted>이 부품에 연결된 형상 {links.filter((link) => link.partKey === part.key).length}개 · 검토 수량 {part.quantity || '미확인'} · 형상 개수는 수량과 자동 합산하지 않습니다.</Muted>}
      {manifest?.shapeList.length === 1 && (current?.groupList.length ?? 0) > 1 && <Notice>STEP이 한 형상으로 합쳐져 있습니다. 부품별 연결에는 분리된 조립품 STEP이 필요합니다.</Notice>}
    </BindingInfo>
    {manifest ? <StepShapeList key={manifest.sha256} manifest={manifest} selectedId={step.selectedId} links={links} groupList={current?.groupList ?? []} partList={current?.partList ?? []} onSelect={step.select} /> : <Empty>STEP을 올리면 형상 목록이 표시됩니다.</Empty>}
  </ReviewPanel>;
}
const BindingInfo = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2], padding: theme.space[4], flexShrink: 0 }));
const SelectedPart = styled.strong(({ theme }) => ({ fontSize: theme.size.base, fontWeight: theme.weight.medium, overflowWrap: 'anywhere' }));
const Notice = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2], color: theme.color.warning, fontSize: theme.size.sm, lineHeight: 1.6, overflowWrap: 'anywhere' }));
const Actions = styled.div(({ theme }) => ({ display: 'flex', gap: theme.space[2], '& > button': { flex: 1, minHeight: theme.space[6] + theme.space[2] } }));
const ResetButton = styled(ActionButton)(({ theme }) => ({ fontSize: theme.size.sm, minHeight: theme.space[6] + theme.space[2] }));
const Empty = styled.p(({ theme }) => ({ padding: theme.space[4], color: theme.color.inkMuted, fontSize: theme.size.md }));
