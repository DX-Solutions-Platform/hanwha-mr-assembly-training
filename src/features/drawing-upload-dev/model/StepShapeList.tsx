import { useState } from 'react';
import styled from 'styled-components';
import type { ReviewedPart, ReviewGroup } from '../review/reviewTypes';
import { shapeLabel } from './stepModel';
import type { ModelLink, StepManifest } from './stepTypes';
import { Muted, ScrollArea, StateText } from '../ui/sharedStyles';
import { ReviewInput } from '../review/reviewStyles';

export function StepShapeList({ manifest, selectedId, links, groupList, partList, onSelect }: {
  manifest: StepManifest; selectedId: string | null; links: ModelLink[]; groupList: ReviewGroup[]; partList: ReviewedPart[]; onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(100);
  const shapes = manifest.shapeList.filter((shape) => (shape.name + ' ' + shape.path + ' ' + (shape.meshIndex + 1)).toLowerCase().includes(query.trim().toLowerCase()));
  return <Root aria-label="STEP 형상 목록">
    <Search><ReviewInput aria-label="3D 형상 검색" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(100); }} placeholder="STEP 이름·조립 경로 검색" /><Muted>{shapes.length}개 형상 · 연결 {links.length}개</Muted></Search>
    <List>{shapes.slice(0, limit).map((shape) => {
      const link = links.find((item) => item.shapeId === shape.id);
      const owner = groupList.find((group) => group.key === link?.partKey);
      const isConfirmed = partList.find((part) => part.key === link?.partKey)?.status === 'confirmed';
      return <Row key={shape.id} data-step-shape={shape.id} aria-pressed={selectedId === shape.id} $selected={selectedId === shape.id} onClick={() => onSelect(shape.id)}>
        <Title><b>{shapeLabel(shape)}</b><Muted>형상 {shape.meshIndex + 1}</Muted></Title>
        <Path title={shape.path}>{shape.path || '조립 경로 미기재'}</Path>
        {owner && <StateText $tone={isConfirmed ? 'success' : 'warning'}>↔ {owner.partNumber || '부품번호 미기재'}{isConfirmed ? '' : ' · 부품 재확정 필요'}</StateText>}
      </Row>;
    })}{!shapes.length && <Muted>검색 결과가 없습니다.</Muted>}
      {shapes.length > limit && <More onClick={() => setLimit((value) => value + 100)}>다음 {Math.min(100, shapes.length - limit)}개 보기</More>}
    </List>
  </Root>;
}
const Root = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: theme.space[3] }));
const Search = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2], padding: '0 ' + theme.space[3] + 'px', flexShrink: 0 }));
const List = styled(ScrollArea)(({ theme }) => ({ flex: 1, padding: '0 ' + theme.space[3] + 'px ' + theme.space[3] + 'px' }));
const Row = styled.button<{ $selected: boolean }>(({ theme, $selected }) => ({ width: '100%', display: 'flex', flexDirection: 'column', gap: theme.space[1], textAlign: 'left', padding: theme.space[3], marginBottom: theme.space[2], border: '1px solid ' + ($selected ? theme.color.primary : theme.color.primaryLineWeak), background: $selected ? theme.color.primaryFill : theme.color.panel, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
const Title = styled.div(({ theme }) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: theme.space[2], fontSize: theme.size.md, b: { minWidth: 0, overflowWrap: 'anywhere', fontWeight: theme.weight.medium } }));
const Path = styled.span(({ theme }) => ({ display: 'block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: theme.color.inkMuted, fontSize: theme.size.xs }));
const More = styled.button(({ theme }) => ({ width: '100%', padding: theme.space[3], color: theme.color.primarySoft, fontSize: theme.size.sm }));
