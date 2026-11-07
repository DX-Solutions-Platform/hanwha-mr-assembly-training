import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { DIMENSION_LABEL, type DrawingPage, type Evidence, type ResultTab } from '../types';
import { ActionButton, Muted, ScrollArea, StateText } from './sharedStyles';

const TAB_LIST: { id: ResultTab; label: string }[] = [{ id: 'parts', label: '부품표·번호' }, { id: 'dimensions', label: '치수' }, { id: 'text', label: '원문 텍스트' }];
export function ResultPanel({ pageList, selectedPage, onInspect }: { pageList: DrawingPage[]; selectedPage: number; onInspect: (source: Evidence) => void }) {
  const [tab, setTab] = useState<ResultTab>('parts');
  const [query, setQuery] = useState('');
  const [isPageOnly, setIsPageOnly] = useState(false);
  const [rowLimit, setRowLimit] = useState(100);
  const pages = useMemo(() => isPageOnly ? pageList.filter((page) => page.pageNumber === selectedPage) : pageList, [pageList, isPageOnly, selectedPage]);
  const includesQuery = (value: string) => value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const parts = pages.flatMap((page) => page.partList).filter((part) => includesQuery([part.item, part.partNumber, part.name, part.material, part.specification].join(' ')));
  const dimensions = pages.flatMap((page) => page.dimensionList).filter((item) => includesQuery(item.value + ' ' + DIMENSION_LABEL[item.kind]));
  const lines = pages.flatMap((page) => page.lineList.map((line) => ({ ...line, pageNumber: page.pageNumber }))).filter((line) => includesQuery(line.text));
  const count = tab === 'parts' ? parts.length : tab === 'dimensions' ? dimensions.length : lines.length;
  return <Root aria-label="PDF 추출 결과">
    <Tabs role="tablist" aria-label="추출 결과 종류" onKeyDown={(event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = TAB_LIST.findIndex((item) => item.id === tab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? TAB_LIST.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + TAB_LIST.length) % TAB_LIST.length;
      setTab(TAB_LIST[next].id); setRowLimit(100);
      event.currentTarget.querySelector<HTMLButtonElement>('#tab-' + TAB_LIST[next].id)?.focus();
    }}>{TAB_LIST.map((item) => <Tab key={item.id} id={'tab-' + item.id} type="button" role="tab" tabIndex={tab === item.id ? 0 : -1} aria-selected={tab === item.id} aria-controls="extraction-results" $active={tab === item.id} onClick={() => { setTab(item.id); setRowLimit(100); }}>{item.label}</Tab>)}<Count>{count}건</Count></Tabs>
    <Controls>
      <Search aria-label="추출 결과 검색" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setRowLimit(100); }} placeholder="부품번호·명칭·치수 검색" />
      <Scope><input type="checkbox" checked={isPageOnly} onChange={(event) => { setIsPageOnly(event.target.checked); setRowLimit(100); }} />{selectedPage}쪽만</Scope>
    </Controls>
    <Hint>{tab === 'parts' ? '표의 열을 기준으로 읽은 행과 부품번호 후보입니다. 수량이 없는 항목은 합산하지 않습니다.' : tab === 'dimensions' ? '기호·단위를 포함한 표기를 추출합니다. 수치 후보는 치수인지 원문 확인이 필요합니다.' : 'PDF에 포함된 텍스트입니다. 이미지 속 글자는 포함되지 않을 수 있습니다.'}</Hint>
    <Results id="extraction-results" role="tabpanel" aria-labelledby={'tab-' + tab}>
      {!count && <Empty>{!pageList.length ? 'PDF를 선택하면 추출 결과가 여기에 표시됩니다.' : query ? '검색 결과가 없습니다.' : tab === 'parts' ? '자동으로 읽을 수 있는 부품표·부품번호를 찾지 못했습니다. 원문에서 표의 형식을 확인해 주세요.' : tab === 'dimensions' ? '읽을 수 있는 치수 표기가 없습니다. 이미지로 된 치수는 원문 확인이 필요합니다.' : '텍스트가 없는 페이지입니다. 스캔 이미지에는 별도 OCR이 필요합니다.'}</Empty>}
      {!!count && tab === 'parts' && <Table>
        <thead><tr><th>부품번호·명칭</th><th>수량</th><th>재질·규격</th><th>출처</th></tr></thead>
        <tbody>{parts.slice(0, rowLimit).map((part) => <tr key={part.id} data-record="part">
          <td><b>{part.partNumber || part.item || '번호 미기재'}</b><span>{part.name || '품명 미기재'}</span>{part.kind === 'code' && <StateText $tone="warning">부품번호 후보</StateText>}</td>
          <td>{part.quantityText || '—'}</td><td>{[part.material, part.specification].filter(Boolean).join(' · ') || '—'}</td>
          <td><SourceButton onClick={() => onInspect(part.source)} aria-label={part.source.pageNumber + '쪽 ' + (part.partNumber || part.name) + ' 원문 확인'}>{part.source.pageNumber}쪽 ↗</SourceButton></td>
        </tr>)}</tbody>
      </Table>}
      {!!count && tab === 'dimensions' && <Table>
        <thead><tr><th>유형</th><th>원문 표기</th><th>단위</th><th>출처</th></tr></thead>
        <tbody>{dimensions.slice(0, rowLimit).map((item) => <tr key={item.id} data-record="dimension" data-kind={item.kind}>
          <td><StateText $tone={item.kind === 'candidate' ? 'warning' : undefined}>{DIMENSION_LABEL[item.kind]}</StateText></td>
          <td><b>{item.value}</b></td><td title={item.unitSource ?? '단위 근거 없음'}>{item.unit === 'metric' ? 'M 규격' : item.unit || <StateText $tone="warning">미확인</StateText>}</td>
          <td><SourceButton onClick={() => onInspect(item.source)} aria-label={item.source.pageNumber + '쪽 ' + item.value + ' 원문 확인'}>{item.source.pageNumber}쪽 ↗</SourceButton></td>
        </tr>)}</tbody>
      </Table>}
      {tab === 'text' && <TextList>{lines.slice(0, rowLimit).map((line, index) => <TextRow key={line.pageNumber + '-' + index} onClick={() => onInspect({ pageNumber: line.pageNumber, text: line.text, rect: line.rect })}><Muted>{line.pageNumber}쪽</Muted><span>{line.text}</span></TextRow>)}</TextList>}
      {count > rowLimit && <More onClick={() => setRowLimit((value) => value + 100)}>다음 {Math.min(100, count - rowLimit)}건 보기 · 총 {count}건</More>}
    </Results>
  </Root>;
}
const Root = styled.section(({ theme }) => ({ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid ' + theme.color.primaryLineWeak, background: theme.color.panel }));
const Tabs = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'stretch', flexShrink: 0, minHeight: theme.space[7], borderBottom: '1px solid ' + theme.color.primaryLineWeak }));
const Tab = styled.button<{ $active: boolean }>(({ theme, $active }) => ({
  padding: theme.space[3] + 'px ' + theme.space[4] + 'px', fontSize: theme.size.md,
  background: $active ? theme.color.primaryFill : 'transparent', color: $active ? theme.color.primarySoft : theme.color.inkMuted,
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft, outlineOffset: -2 },
}));
const Count = styled.span(({ theme }) => ({ marginLeft: 'auto', padding: theme.space[3], alignSelf: 'center', fontFamily: theme.font.mono, fontSize: theme.size.sm, color: theme.color.primarySoft }));
const Controls = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'center', gap: theme.space[3], padding: theme.space[3] }));
const Search = styled.input(({ theme }) => ({
  width: '100%', minWidth: 0, padding: theme.space[2] + 'px ' + theme.space[3] + 'px', font: 'inherit', fontSize: theme.size.sm,
  color: theme.color.ink, background: theme.color.bgEdge, border: '1px solid ' + theme.color.primaryLineWeak,
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft },
}));
const Scope = styled.label(({ theme }) => ({ display: 'flex', alignItems: 'center', gap: theme.space[1], whiteSpace: 'nowrap', fontSize: theme.size.sm, color: theme.color.inkMuted, input: { accentColor: theme.color.primary } }));
const Hint = styled.p(({ theme }) => ({ margin: 0, padding: '0 ' + theme.space[3] + 'px ' + theme.space[2] + 'px', fontSize: theme.size.xs, lineHeight: 1.6, color: theme.color.inkDisabled }));
const Results = styled(ScrollArea)({ flex: 1 });
const Table = styled.table(({ theme }) => ({
  width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', textAlign: 'left', fontSize: theme.size.md,
  th: { position: 'sticky', top: 0, background: theme.color.bgMid, fontWeight: theme.weight.medium, color: theme.color.inkMuted, fontSize: theme.size.sm },
  'th, td': { padding: theme.space[3], verticalAlign: 'top', borderBottom: '1px solid ' + theme.color.primaryLineWeak, overflowWrap: 'anywhere' },
  'th:first-child': { width: '38%' }, 'th:nth-child(2)': { width: '15%' }, 'th:last-child': { width: '17%' },
  'td b': { display: 'block', fontFamily: theme.font.mono, fontSize: theme.size.sm, color: theme.color.ink, fontWeight: theme.weight.medium },
  'td > span': { display: 'block', lineHeight: 1.6 }, 'tbody tr:hover': { background: theme.color.primaryFill },
}));
const SourceButton = styled.button(({ theme }) => ({ color: theme.color.primarySoft, textDecoration: 'underline', whiteSpace: 'nowrap', '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
const Empty = styled.p(({ theme }) => ({ margin: 0, padding: theme.space[5], fontSize: theme.size.md, lineHeight: 1.8, color: theme.color.inkMuted }));
const TextList = styled.div({ display: 'flex', flexDirection: 'column' });
const TextRow = styled.button(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: theme.space[3], textAlign: 'left',
  padding: theme.space[3], fontSize: theme.size.sm, lineHeight: 1.6, overflowWrap: 'anywhere',
  borderBottom: '1px solid ' + theme.color.primaryLineWeak, '&:hover': { background: theme.color.primaryFill },
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft, outlineOffset: -2 },
}));
const More = styled(ActionButton)(({ theme }) => ({ margin: theme.space[3], minHeight: theme.space[6] }));
