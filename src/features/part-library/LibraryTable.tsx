import Image from 'next/image';
import styled from 'styled-components';
import { CATEGORY_LABEL, libraryAssetUrl, type LibraryPart } from './libraryTypes';
import { LibraryPanel, LibraryPanelTitle, LibraryStatus } from './libraryStyles';

export function LibraryTable({ parts, selected, isGallery, onSelect }: {
  parts: LibraryPart[]; selected?: string; isGallery: boolean; onSelect: (number: string) => void;
}) {
  const icon = (part: LibraryPart) => part.photo ? <Image src={libraryAssetUrl(part.photo)} alt="" width={57} height={45} unoptimized /> : <ModelMark>{part.model ? '3D' : '—'}</ModelMark>;
  return <LibraryPanel aria-label="부품 목록">
    <LibraryPanelTitle>{isGallery ? '3D 진열' : '목록'} · {parts.length.toLocaleString('ko-KR')}종</LibraryPanelTitle>
    <ListScroll>
      {!parts.length ? <Empty>조건에 맞는 부품이 없습니다. 부품 등록이나 도면 검토에서 추가하세요.</Empty> : isGallery
        ? <Gallery>{parts.map((part) => <Card key={part.partNumber} $selected={selected === part.partNumber} onClick={() => onSelect(part.partNumber)} aria-pressed={selected === part.partNumber}>{icon(part)}<b>{part.partNumber}</b><span>{part.name}</span></Card>)}</Gallery>
        : <Table>
          <thead><tr>{['3D', '코드', '이름', '분류', '규격', '개정', '상태', '사용'].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
          <tbody>{parts.map((part) => <Row key={part.partNumber} $selected={selected === part.partNumber} onClick={() => onSelect(part.partNumber)} data-library-number={part.partNumber}>
            <td>{icon(part)}</td>
            <td><Code onClick={() => onSelect(part.partNumber)} aria-pressed={selected === part.partNumber}>{part.partNumber}</Code></td>
            <td>{part.name}</td><td>{CATEGORY_LABEL[part.category]}</td><td>{part.specification || '—'}</td><td>{part.revision}</td>
            <td><LibraryStatus $approved={part.status === 'approved'}>{part.status === 'approved' ? '승인' : '대기'}</LibraryStatus></td><td>{part.usage || '—'}</td>
          </Row>)}</tbody>
        </Table>}
    </ListScroll>
  </LibraryPanel>;
}
const ListScroll = styled.div({ overflow: 'auto', minHeight: 0, flex: 1 });
const Table = styled.table(({ theme }) => ({
  width: '100%', minWidth: 760, borderCollapse: 'collapse', textAlign: 'left', fontSize: theme.size.sm,
  th: { position: 'sticky', top: 0, background: theme.color.bgMid, color: theme.color.inkMuted, fontWeight: 400, zIndex: 1 },
  'th, td': { padding: theme.space[3], borderBottom: '1px solid ' + theme.color.bgCenter, overflowWrap: 'anywhere' },
  'td:first-child': { width: 62 }, 'td:nth-child(2)': { width: '20%' }, img: { objectFit: 'contain' },
}));
const Row = styled.tr<{ $selected: boolean }>(({ theme, $selected }) => ({
  background: $selected ? theme.color.primaryFill : 'transparent', cursor: 'pointer',
  '&:hover': { background: theme.color.primaryFill },
}));
const Code = styled.button(({ theme }) => ({ textAlign: 'left', fontFamily: theme.font.mono, color: theme.color.ink, fontWeight: theme.weight.bold, overflowWrap: 'anywhere', '&:focus-visible': { outline: '1px solid ' + theme.color.primary } }));
const ModelMark = styled.span(({ theme }) => ({ width: 56, height: 38, display: 'grid', placeItems: 'center', border: '1px solid ' + theme.color.bgCenter, color: theme.color.inkMuted, fontFamily: theme.font.mono }));
const Gallery = styled.div(({ theme }) => ({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: theme.space[3], padding: theme.space[4] }));
const Card = styled.button<{ $selected: boolean }>(({ theme, $selected }) => ({
  minWidth: 0, minHeight: 130, padding: theme.space[3], display: 'grid', justifyItems: 'center', gap: theme.space[2],
  border: '1px solid ' + ($selected ? theme.color.primary : theme.color.bgCenter), background: $selected ? theme.color.primaryFill : 'transparent',
  b: { fontFamily: theme.font.mono, fontSize: theme.size.sm, overflowWrap: 'anywhere' }, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft },
}));
const Empty = styled.p(({ theme }) => ({ padding: theme.space[4], color: theme.color.inkMuted }));
