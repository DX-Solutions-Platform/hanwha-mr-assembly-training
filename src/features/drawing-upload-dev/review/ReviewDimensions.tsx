import { useState } from 'react';
import styled from 'styled-components';
import { DIMENSION_LABEL, type DimensionRecord, type Evidence } from '../types';
import type { ReviewedPart } from './reviewTypes';
import { ActionButton, Muted, StateText } from '../ui/sharedStyles';
import { CheckLabel, InlineButton, ReviewInput, ReviewLabel } from './reviewStyles';

export function ReviewDimensions({ part, dimensionList, onChange, onInspect }: {
  part: ReviewedPart; dimensionList: DimensionRecord[]; onChange: (patch: Partial<ReviewedPart>) => void; onInspect: (source: Evidence) => void;
}) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(40);
  const available = dimensionList.filter((item) => !part.dimensionList.some((entry) => entry.sourceId === item.id) && (item.value + ' ' + item.source.pageNumber + '쪽').toLowerCase().includes(query.trim().toLowerCase()));
  const update = (id: string, field: 'value' | 'unit', value: string) => onChange({ dimensionList: part.dimensionList.map((item) => item.id === id ? { ...item, [field]: value } : item) });
  return <Root>
    <Muted>해당 부품의 치수인지 원문을 확인한 뒤 연결하세요. 같은 페이지의 치수를 자동 배정하지 않습니다.</Muted>
    <CheckLabel><input aria-label="원문에 치수 없음 확인" type="checkbox" checked={part.hasNoDimensions} disabled={part.dimensionList.length > 0} onChange={(event) => onChange({ hasNoDimensions: event.target.checked })} />원문에 이 부품의 치수가 기재되지 않았음을 확인했습니다.</CheckLabel>
    {part.dimensionList.map((item, index) => {
      const original = dimensionList.find((entry) => entry.id === item.sourceId);
      return <Linked key={item.id}>
        <Row><strong>치수 {index + 1}</strong><InlineButton onClick={() => onChange({ dimensionList: part.dimensionList.filter((entry) => entry.id !== item.id) })}>연결 해제</InlineButton></Row>
        <Inputs>
          <ReviewLabel>표기·값<ReviewInput aria-label={'검토 치수 ' + (index + 1) + ' 값'} value={item.value} maxLength={300} onChange={(event) => update(item.id, 'value', event.target.value)} /></ReviewLabel>
          <ReviewLabel>단위<ReviewInput aria-label={'검토 치수 ' + (index + 1) + ' 단위'} value={item.unit} maxLength={40} placeholder="mm / ° / M 규격" onChange={(event) => update(item.id, 'unit', event.target.value)} /></ReviewLabel>
        </Inputs>
        {original ? <Original><Muted>추출: {original.value} · {original.unit === 'metric' ? 'M 규격' : original.unit ?? '단위 미확인'}</Muted><InlineButton onClick={() => onInspect(original.source)}>{original.source.pageNumber}쪽 원문</InlineButton></Original> : <StateText $tone="warning">{item.id.startsWith('library-dimension-') ? '라이브러리 치수 · 현재 도면과 대조해 주세요.' : '직접 입력한 치수 · 검토 메모에 근거를 남겨 주세요.'}</StateText>}
      </Linked>;
    })}
    <ActionButton onClick={() => onChange({ hasNoDimensions: false, dimensionList: [...part.dimensionList, { id: 'manual-' + crypto.randomUUID(), sourceId: null, value: '', unit: '' }] })}>치수 직접 입력 +</ActionButton>
    <Divider>원문에서 추출한 치수 연결</Divider>
    <ReviewInput type="search" aria-label="연결할 치수 검색" value={query} placeholder="치수 또는 페이지 검색" onChange={(event) => { setQuery(event.target.value); setLimit(40); }} />
    {available.slice(0, limit).map((item) => <Candidate key={item.id}>
      <div><b>{item.value}</b><Muted>{DIMENSION_LABEL[item.kind]} · {item.unit ?? '단위 미확인'} · {item.source.pageNumber}쪽</Muted></div>
      <InlineButton aria-label={item.source.pageNumber + '쪽 ' + item.value + ' 치수 원문'} onClick={() => onInspect(item.source)}>원문</InlineButton>
      <InlineButton aria-label={item.source.pageNumber + '쪽 ' + item.value + ' 치수 연결'} onClick={() => {
        onChange({ hasNoDimensions: false, dimensionList: [...part.dimensionList, { id: item.id, sourceId: item.id, value: item.value, unit: item.unit === 'metric' ? 'M 규격' : item.unit ?? '' }] }); onInspect(item.source);
      }}>연결 +</InlineButton>
    </Candidate>)}
    {!available.length && <Muted>{query ? '검색 결과가 없습니다.' : '추가로 연결할 치수 표기가 없습니다.'}</Muted>}
    {available.length > limit && <InlineButton onClick={() => setLimit((value) => value + 40)}>다음 {Math.min(40, available.length - limit)}개 보기</InlineButton>}
  </Root>;
}
const Root = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[3] }));
const Linked = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2], padding: theme.space[3], border: '1px solid ' + theme.color.primaryLine, background: theme.color.primaryFill }));
const Row = styled.div({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' });
const Inputs = styled.div(({ theme }) => ({ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: theme.space[2] }));
const Original = styled.div(({ theme }) => ({ display: 'flex', gap: theme.space[2], alignItems: 'baseline', justifyContent: 'space-between' }));
const Divider = styled.h3(({ theme }) => ({ margin: theme.space[2] + 'px 0', paddingTop: theme.space[3], borderTop: '1px solid ' + theme.color.primaryLineWeak, fontSize: theme.size.md, color: theme.color.primarySoft }));
const Candidate = styled.div(({ theme }) => ({ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', alignItems: 'center', gap: theme.space[2], padding: theme.space[2], border: '1px solid ' + theme.color.primaryLineWeak, '& > div': { display: 'flex', flexDirection: 'column', gap: theme.space[1], overflowWrap: 'anywhere' }, b: { fontFamily: theme.font.mono, fontWeight: theme.weight.medium, fontSize: theme.size.sm } }));
