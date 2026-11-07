import { useState } from 'react';
import styled from 'styled-components';
import type { DimensionRecord, Evidence } from '../types';
import { ActionButton, Muted, StateText } from '../ui/sharedStyles';
import { getReviewIssues, needsReviewFields } from './reviewModel';
import { REVIEW_FIELD_LIST, type ReviewedPart, type ReviewGroup } from './reviewTypes';
import { ReviewBody, ReviewHeader, ReviewLabel, ReviewPanel, ReviewTextArea, ReviewTitle } from './reviewStyles';
import { ReviewFieldInput } from './ReviewFieldInput';
import { ReviewDimensions } from './ReviewDimensions';

export function ReviewEditor({ group, part, dimensionList, onChange, onConfirm, onInspect, onRetryWithAwq, onSelectShapeArea, isAnalyzingShape }: {
  group: ReviewGroup; part: ReviewedPart; dimensionList: DimensionRecord[];
  onChange: (patch: Partial<ReviewedPart>) => void; onConfirm: () => void; onInspect: (source: Evidence) => void;
  onRetryWithAwq?: () => void; onSelectShapeArea?: () => void; isAnalyzingShape?: boolean;
}) {
  const [tab, setTab] = useState<'fields' | 'dimensions'>('fields');
  const [hasAttempted, setHasAttempted] = useState(false);
  const issueList = getReviewIssues(part);
  const handleConfirm = () => {
    setHasAttempted(true);
    if (issueList.length) {
      setTab(issueList[0].includes('치수') && !issueList[0].includes('메모') ? 'dimensions' : 'fields');
      return;
    }
    onConfirm(); setHasAttempted(false);
  };
  return <ReviewPanel aria-label="부품 검토 편집" data-review-status={part.status}>
    <ReviewHeader><ReviewTitle>{group.partNumber || '부품번호 미기재'}</ReviewTitle><StateText $tone={part.status === 'confirmed' ? 'success' : 'warning'}>{part.status === 'confirmed' ? '검토 확정' : '검토 중'}</StateText></ReviewHeader>
    <Tabs><Tab $active={tab === 'fields'} aria-pressed={tab === 'fields'} onClick={() => setTab('fields')}>품명·수량·재질</Tab><Tab $active={tab === 'dimensions'} aria-pressed={tab === 'dimensions'} onClick={() => setTab('dimensions')}>치수 {part.dimensionList.length}</Tab></Tabs>
    <ReviewBody>
      {group.recordList.some((record) => record.source.method) && <StateText data-ocr-review $tone="warning">OCR로 자동 입력한 값입니다. 품명·수량·재질과 치수를 원문에 대조한 뒤 확정하세요.</StateText>}
      {part.librarySource && <StateText data-library-source $tone="success">{part.librarySource}</StateText>}
      {hasAttempted && issueList.length > 0 && <Issues role="alert">{issueList.map((issue) => <p key={issue}>{issue}</p>)}</Issues>}
      {tab === 'fields' ? <>
        {onRetryWithAwq && <ActionButton disabled={isAnalyzingShape} onClick={onRetryWithAwq}>27B로 다시 분석</ActionButton>}
        {onSelectShapeArea && <ActionButton disabled={isAnalyzingShape} onClick={onSelectShapeArea}>도면 영역으로 품명 제안</ActionButton>}
        {needsReviewFields(part) && group.recordList.every((record) => record.kind === 'code') && <StateText $tone="warning">부품표 외 원문에서 만든 항목입니다. 빠진 정보는 일괄 입력으로 보완할 수 있습니다.</StateText>}
        {REVIEW_FIELD_LIST.map((field) => <ReviewFieldInput key={field.key} field={field.key} label={field.label} value={part[field.key]} hasTemporaryName={field.key === 'name' && part.hasTemporaryName} shapeNameSuggestion={field.key === 'name' ? part.shapeNameSuggestion : undefined} group={group} onChange={(value) => onChange({ [field.key]: value })} onInspect={onInspect} />)}
        <Sources><summary>원문 출처 {group.recordList.length}건 보기</summary>{group.recordList.map((record) => <Source key={record.id} onClick={() => onInspect(record.source)}><b>{record.source.pageNumber}쪽 · {record.kind === 'table' ? '부품표' : '번호 후보'}</b><span>{record.source.text}</span></Source>)}</Sources>
        <ReviewLabel htmlFor="review-note">검토 메모<ReviewTextArea id="review-note" aria-label="검토 메모" maxLength={6000} value={part.note} placeholder="보정 이유·직접 입력한 치수의 근거" onChange={(event) => onChange({ note: event.target.value })} /></ReviewLabel>
      </> : <ReviewDimensions part={part} dimensionList={dimensionList} onChange={onChange} onInspect={onInspect} />}
    </ReviewBody>
    <ConfirmArea>
      <Muted>{part.status === 'confirmed' ? '확정 후 값을 수정하면 다시 미확정 상태가 됩니다.' : '필수 항목과 치수 연결 여부를 확인한 후 확정하세요.'}</Muted>
      <Actions>
        {part.status === 'confirmed' && <ActionButton onClick={() => onChange({})}>확정 해제</ActionButton>}
        <ActionButton $primary disabled={part.status === 'confirmed'} onClick={handleConfirm}>{part.status === 'confirmed' ? '검토 확정됨' : '이 부품 검토 확정'}</ActionButton>
      </Actions>
    </ConfirmArea>
  </ReviewPanel>;
}
const Tabs = styled.div(({ theme }) => ({ display: 'flex', gap: theme.space[2], padding: theme.space[3], borderBottom: '1px solid ' + theme.color.primaryLineWeak }));
const Tab = styled.button<{ $active: boolean }>(({ theme, $active }) => ({ flex: 1, padding: theme.space[2], color: $active ? theme.color.primarySoft : theme.color.inkMuted, background: $active ? theme.color.primaryFill : 'transparent', border: '1px solid ' + theme.color.primaryLineWeak, fontSize: theme.size.md, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
const Issues = styled.div(({ theme }) => ({ padding: theme.space[3], border: '1px solid ' + theme.color.warning, color: theme.color.warning, fontSize: theme.size.sm, lineHeight: 1.7, p: { margin: 0 } }));
const Sources = styled.details(({ theme }) => ({ color: theme.color.inkMuted, fontSize: theme.size.sm, summary: { cursor: 'pointer', padding: theme.space[2] } }));
const Source = styled.button(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2], marginTop: theme.space[2], width: '100%', textAlign: 'left', padding: theme.space[3], color: theme.color.inkSub, fontSize: theme.size.sm, border: '1px solid ' + theme.color.primaryLineWeak, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', b: { color: theme.color.primarySoft, fontWeight: theme.weight.medium }, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
const ConfirmArea = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2], padding: theme.space[3], borderTop: '1px solid ' + theme.color.primaryLineWeak, flexShrink: 0 }));
const Actions = styled.div(({ theme }) => ({ display: 'flex', gap: theme.space[2], '& > button': { flex: 1 } }));
