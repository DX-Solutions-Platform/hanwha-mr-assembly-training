import styled from 'styled-components';
import { Muted } from '../ui/sharedStyles';
import { AssemblyVectorInput } from './AssemblyVectorInput';
import type { useAssemblyEditor } from './useAssemblyEditor';

export function AssemblyPlacementEditor({ editor }: { editor: ReturnType<typeof useAssemblyEditor> }) {
  const draft = editor.draft!, selected = editor.selected!;
  const position = editor.matrices.get(selected.id)!.elements.slice(12, 15);
  const parent = editor.document!.partList.find((part) => part.id === draft.relation.parentId);
  return <Root>
    <Muted>{parent ? parent.name + '의 결합점을 기준으로 더하는 거리입니다. 기준 부품을 움직이면 함께 움직입니다.' : '전체 좌표를 기준으로 자유롭게 배치합니다.'}</Muted>
    <AssemblyVectorInput label="위치" value={draft.position} limit={5000} unit="mm" onChange={(value) => editor.update({ ...draft, position: value })} />
    <AssemblyVectorInput label="회전" value={draft.rotation} limit={360} unit="° · XYZ" onChange={(value) => editor.update({ ...draft, rotation: value })} />
    <World aria-label="선택 부품 실제 위치" data-world-x={position[0]} data-world-y={position[1]} data-world-z={position[2]}><strong>현재 3D의 실제 위치 · mm</strong><Values>{position.map((value, index) => <span key={index}>{['X', 'Y', 'Z'][index]} {Number(value.toFixed(3))}</span>)}</Values></World>
    <Muted>{selected.relation.type === 'free' ? '자유 배치 · 다른 부품을 따라 움직이지 않습니다.' : '현재 결합점 간격: ' + Math.hypot(...selected.position).toFixed(2) + ' mm · 결합점에 맞추기로 간격과 회전을 0으로 맞출 수 있습니다.'}</Muted>
  </Root>;
}
const Root = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[4] }));
const World = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2], padding: theme.space[3], background: theme.color.primaryFill, border: '1px solid ' + theme.color.primaryLineWeak, fontSize: theme.size.sm, strong: { fontWeight: theme.weight.medium } }));
const Values = styled.div(({ theme }) => ({ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: theme.space[2], color: theme.color.primarySoft, fontFamily: theme.font.mono, overflowWrap: 'anywhere' }));
