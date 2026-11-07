import styled from 'styled-components';
import { ReviewLabel } from '../review/reviewStyles';
import { Muted } from '../ui/sharedStyles';
import { getPartAnchors } from './assemblyTemplate';
import { CONNECTION_LIST, type AssemblyPart, type ConnectionType } from './assemblyTypes';
import { AssemblySelect, SmallAssemblyButton } from './assemblyStyles';
import type { useAssemblyEditor } from './useAssemblyEditor';

function targetAnchors(part: AssemblyPart, type: ConnectionType) {
  return getPartAnchors(part).filter((anchor) => type === 'insert' ? anchor.id.startsWith('hole-') : type === 'thread' ? ['nut-seat', 'tip'].includes(anchor.id) : true);
}
export function AssemblyRelationEditor({ editor }: { editor: ReturnType<typeof useAssemblyEditor> }) {
  const draft = editor.draft!, selected = editor.selected!, document = editor.document!;
  const relation = draft.relation, isFree = relation.type === 'free';
  const parentList = document.partList.filter((part) => part.id !== selected.id && (relation.type === 'insert' ? ['base', 'flange'].includes(part.kind) : relation.type === 'thread' ? part.kind === 'bolt' : true));
  const parent = parentList.find((part) => part.id === relation.parentId);
  const targets = parent ? targetAnchors(parent, relation.type) : [];
  const types = CONNECTION_LIST.filter((item) => selected.model ? item.value === 'free' || (item.value === 'fixed' && document.partList.length > 1) : selected.kind === 'base' ? item.value === 'free' : item.value === 'insert' ? selected.kind === 'bolt' : item.value === 'thread' ? selected.kind === 'nut' : true);
  return <Root>
    <ReviewLabel>결합 종류<AssemblySelect aria-label="조립품 결합 종류" value={relation.type} onChange={(event) => editor.changeType(event.target.value as ConnectionType)}>{types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</AssemblySelect></ReviewLabel>
    <ReviewLabel>기준 부품<AssemblySelect aria-label="조립품 기준 부품" disabled={isFree} value={relation.parentId ?? ''} onChange={(event) => {
      const parent = document.partList.find((part) => part.id === event.target.value);
      if (!parent) { editor.changeType('free'); return; }
      const anchors = targetAnchors(parent, relation.type);
      editor.update({ ...draft, relation: { ...relation, parentId: parent.id, targetAnchorId: anchors.some((anchor) => anchor.id === relation.targetAnchorId) ? relation.targetAnchorId : anchors[0]?.id ?? null } });
    }}><option value="">전체 좌표 · 기준 없음</option>{parentList.map((part) => <option key={part.id} value={part.id}>{part.name} · {part.partNumber}</option>)}</AssemblySelect></ReviewLabel>
    <ReviewLabel>기준 부품의 결합점<AssemblySelect aria-label="조립품 기준 결합점" disabled={isFree || !parent} value={relation.targetAnchorId ?? ''} onChange={(event) => editor.update({ ...draft, relation: { ...relation, targetAnchorId: event.target.value } })}><option value="">결합점 없음</option>{targets.map((anchor) => <option key={anchor.id} value={anchor.id}>{anchor.label}</option>)}</AssemblySelect></ReviewLabel>
    <ReviewLabel>선택 부품의 결합점<AssemblySelect aria-label="조립품 선택 결합점" disabled={isFree} value={relation.ownAnchorId} onChange={(event) => editor.update({ ...draft, relation: { ...relation, ownAnchorId: event.target.value } })}>{getPartAnchors(selected).map((anchor) => <option key={anchor.id} value={anchor.id}>{anchor.label}</option>)}</AssemblySelect></ReviewLabel>
    {!isFree && <SmallAssemblyButton onClick={editor.snap}>결합점에 맞추기</SmallAssemblyButton>}
    <Muted>{selected.model ? 'GLB의 중심·윗면·아랫면을 기준으로 연결합니다. 실제 조립점은 위치·회전에서 맞추세요.' : selected.kind === 'base' ? '베이스판은 전체 조립품의 기준입니다. 위치·회전에서 움직일 수 있습니다.' : '선택 부품의 결합점을 기준 부품의 결합점에 맞춘 뒤 위치 오프셋과 회전을 적용합니다. 자유 배치로 바꾸면 현재 3D 위치를 유지합니다.'}</Muted>
  </Root>;
}
const Root = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[4] }));
