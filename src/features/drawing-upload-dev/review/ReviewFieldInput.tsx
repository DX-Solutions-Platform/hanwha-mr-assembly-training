import styled from 'styled-components';
import type { Evidence } from '../types';
import { getFieldCandidates } from './reviewModel';
import type { ReviewField, ReviewGroup } from './reviewTypes';
import { Muted } from '../ui/sharedStyles';
import { InlineButton, ReviewInput, ReviewLabel } from './reviewStyles';
import { shapeNameModelLabel, type ShapeNameSuggestion } from '../shape-name/shapeNameTypes';

export function ReviewFieldInput({ field, label, value, hasTemporaryName, shapeNameSuggestion, group, onChange, onInspect }: {
  field: ReviewField; label: string; value: string; hasTemporaryName?: boolean; shapeNameSuggestion?: ShapeNameSuggestion; group: ReviewGroup;
  onChange: (value: string) => void; onInspect: (source: Evidence) => void;
}) {
  const candidates = getFieldCandidates(group, field);
  const hasGeneratedName = !!(hasTemporaryName || shapeNameSuggestion);
  return <Root>
    <ReviewLabel htmlFor={'review-' + field}>{label}{field !== 'specification' && ' *'}
      <ReviewInput id={'review-' + field} aria-label={'검토 ' + label} value={value} maxLength={field === 'quantity' ? 100 : 2000} inputMode={field === 'quantity' ? 'decimal' : undefined} onChange={(event) => onChange(event.target.value)} />
    </ReviewLabel>
    {hasTemporaryName && <Muted data-temporary-name>자동 임시 품명 · 원문에 품명이 없어 부여했습니다. 이 이름으로 확정하거나 직접 수정할 수 있습니다.</Muted>}
    {shapeNameSuggestion && <Candidates data-shape-name={shapeNameSuggestion.kind}>
      <Muted>품명 후보 · {shapeNameModelLabel(shapeNameSuggestion.model)}{shapeNameSuggestion.selectedArea && ' · 직접 선택한 영역'} · {shapeNameSuggestion.reason}</Muted>
      <InlineButton onClick={() => onInspect(shapeNameSuggestion.source)}>판단 영역 보기 · {shapeNameSuggestion.source.pageNumber}쪽</InlineButton>
    </Candidates>}
    {candidates.length > 1 ? <Candidates><Muted>원문값이 다릅니다. 사용할 값을 선택하거나 직접 수정하세요.</Muted>{candidates.map((candidate) => <InlineButton key={candidate.value} onClick={() => { onChange(candidate.value); onInspect(candidate.recordList[0].source); }}>적용: {candidate.value} · {[...new Set(candidate.recordList.map((record) => record.source.pageNumber))].join('·')}쪽</InlineButton>)}</Candidates> : candidates.length === 1 ? <Original><Muted>추출: {candidates[0].value}</Muted><InlineButton onClick={() => onInspect(candidates[0].recordList[0].source)}>원문 보기</InlineButton></Original> : !hasGeneratedName && <Muted>{value ? '검토 입력값 · 원문과 대조해 주세요.' : field === 'specification' ? '필요할 때만 입력하세요.' : '도면에서 미확인 · 일괄 입력으로 보완할 수 있습니다.'}</Muted>}
  </Root>;
}
const Root = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[1] }));
const Candidates = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: theme.space[1], padding: theme.space[2], background: theme.color.primaryFill }));
const Original = styled.div(({ theme }) => ({ display: 'flex', gap: theme.space[2], alignItems: 'baseline', justifyContent: 'space-between', overflowWrap: 'anywhere' }));
