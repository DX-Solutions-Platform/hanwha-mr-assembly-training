import { useState } from 'react';
import styled from 'styled-components';
import type { ReviewedPart, ReviewGroup } from './reviewTypes';
import { ActionButton, Muted, ScrollArea, StateText } from '../ui/sharedStyles';
import { ReviewHeader, ReviewInput, ReviewPanel, ReviewTitle } from './reviewStyles';
import { needsReviewFields } from './reviewModel';

export function ReviewPartList({ groupList, partList, selectedKey, onSelect, onBulk, heldKeys }: {
  groupList: ReviewGroup[]; partList: ReviewedPart[]; selectedKey: string; onSelect: (key: string) => void; onBulk?: () => void;
  heldKeys?: string[];
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'draft' | 'confirmed' | 'needs'>('all');
  const confirmedCount = partList.filter((part) => part.status === 'confirmed').length;
  const needsCheck = (group: ReviewGroup, part: ReviewedPart) => needsReviewFields(part) || (part.status !== 'confirmed' && group.recordList.some((record) => record.source.method && (record.source.confidence ?? 100) < 80));
  const needsCount = groupList.filter((group) => needsCheck(group, partList.find((part) => part.key === group.key)!)).length;
  const filtered = groupList.filter((group) => {
    const part = partList.find((item) => item.key === group.key)!;
    return (filter === 'all' || (filter === 'needs' ? needsCheck(group, part) : part.status === filter)) && [group.partNumber, part.name, part.material].join(' ').toLowerCase().includes(query.trim().toLowerCase());
  });
  return <ReviewPanel aria-label="부품번호별 검토 목록">
    <ReviewHeader><ReviewTitle>부품 묶음</ReviewTitle><Muted>{groupList.length}종</Muted></ReviewHeader>
    <Controls>
      <ReviewInput type="search" aria-label="검토 부품 검색" placeholder="부품번호·품명 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
      <Filters>{([{ id: 'all', label: '전체', count: groupList.length }, { id: 'needs', label: '보완', count: needsCount }, { id: 'draft', label: '미확정', count: groupList.length - confirmedCount }, { id: 'confirmed', label: '확정', count: confirmedCount }] as const).map((item) => <Filter key={item.id} $active={filter === item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label} {item.count}</Filter>)}</Filters>
      <Muted>같은 부품번호로 묶었습니다. 반복 수량은 합산하지 않습니다.</Muted>
      {onBulk && <ActionButton onClick={onBulk}>일괄 입력·확정</ActionButton>}
    </Controls>
    <List>{filtered.map((group) => {
      const part = partList.find((item) => item.key === group.key)!;
      const pages = [...new Set(group.recordList.map((record) => record.source.pageNumber))];
      return <Row key={group.key} $selected={group.key === selectedKey} aria-pressed={group.key === selectedKey} data-review-part={group.key} onClick={() => onSelect(group.key)}>
        <RowHead><strong>{group.partNumber || '부품번호 미기재'}</strong><StateText $tone={part.status === 'confirmed' ? 'success' : 'warning'}>{part.status === 'confirmed' ? '확정' : '미확정'}</StateText></RowHead>
        <span>{part.name || '품명 확인 필요'}</span>
        {part.hasTemporaryName && <StateText $tone="warning">자동 임시 품명</StateText>}
        {heldKeys?.includes(group.key) && part.hasTemporaryName && <StateText $tone="warning">8B 판별 보류</StateText>}
        {part.shapeNameSuggestion && <StateText $tone={part.status === 'confirmed' ? 'success' : 'warning'}>형상 추정</StateText>}
        <Muted>원문 {group.recordList.length}건 · {pages.join('·')}쪽</Muted>
        {!!group.conflictFieldList.length && <StateText $tone="warning">원문값 차이 {group.conflictFieldList.length}항목</StateText>}
        {part.status !== 'confirmed' && group.recordList.some((record) => record.source.method) && <StateText $tone="warning">OCR 원문 대조 필요</StateText>}
      </Row>;
    })}{!filtered.length && <Empty>해당하는 부품이 없습니다.</Empty>}</List>
  </ReviewPanel>;
}
const Controls = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[3], padding: theme.space[4] }));
const Filters = styled.div(({ theme }) => ({ display: 'flex', gap: theme.space[1] }));
const Filter = styled.button<{ $active: boolean }>(({ theme, $active }) => ({ flex: 1, padding: theme.space[2] + 'px ' + theme.space[1] + 'px', whiteSpace: 'nowrap', fontSize: theme.size.sm, color: $active ? theme.color.primarySoft : theme.color.inkMuted, background: $active ? theme.color.primaryFill : 'transparent', border: '1px solid ' + theme.color.primaryLineWeak, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
const List = styled(ScrollArea)(({ theme }) => ({ flex: 1, padding: '0 ' + theme.space[3] + 'px ' + theme.space[3] + 'px' }));
const Row = styled.button<{ $selected: boolean }>(({ theme, $selected }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2], width: '100%', padding: theme.space[3], marginBottom: theme.space[2], textAlign: 'left', fontSize: theme.size.md, overflowWrap: 'anywhere', border: '1px solid ' + ($selected ? theme.color.primary : theme.color.primaryLineWeak), background: $selected ? theme.color.primaryFill : theme.color.panel, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
const RowHead = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: theme.space[2], strong: { fontFamily: theme.font.mono, fontWeight: theme.weight.medium, minWidth: 0 } }));
const Empty = styled.p(({ theme }) => ({ color: theme.color.inkMuted, padding: theme.space[3], fontSize: theme.size.md }));
