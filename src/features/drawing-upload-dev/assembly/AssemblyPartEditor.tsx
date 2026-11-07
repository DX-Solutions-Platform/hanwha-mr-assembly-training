import { useState } from 'react';
import styled from 'styled-components';
import { ReviewBody, ReviewHeader, ReviewPanel, ReviewTitle } from '../review/reviewStyles';
import { StateText } from '../ui/sharedStyles';
import { InlineButton } from '../review/reviewStyles';
import { AssemblyPlacementEditor } from './AssemblyPlacementEditor';
import { AssemblyRelationEditor } from './AssemblyRelationEditor';
import type { useAssemblyEditor } from './useAssemblyEditor';

export function AssemblyPartEditor({ editor }: { editor: ReturnType<typeof useAssemblyEditor> }) {
  const [tab, setTab] = useState('placement');
  const part = editor.selected!;
  return <ReviewPanel aria-label="조립품 부품 편집" data-editing-part={part.id}>
    <ReviewHeader><ReviewTitle>{part.name}</ReviewTitle><StateText $tone={editor.issues.length ? 'warning' : undefined}>{editor.issues.length ? '입력 확인' : '실시간 미리보기'}</StateText></ReviewHeader>
    <PartCode>{part.partNumber}</PartCode>
    <Tabs>{[{ id: 'placement', label: '위치·회전' }, { id: 'relation', label: '결합 관계' }].map((item) => <Tab key={item.id} $active={tab === item.id} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</Tab>)}</Tabs>
    <ReviewBody>{tab === 'placement' ? <AssemblyPlacementEditor editor={editor} /> : <AssemblyRelationEditor editor={editor} />}</ReviewBody>
    {editor.issues.length > 0 && <Issues role="alert">{editor.issues.map((issue) => <div key={issue}>{issue}</div>)}<InlineButton aria-label="미적용 입력 취소" onClick={editor.undo}>마지막 정상값으로 되돌리기</InlineButton></Issues>}
    <Hint>값을 바꾸면 3D에 바로 반영됩니다.</Hint>
  </ReviewPanel>;
}
const PartCode = styled.div(({ theme }) => ({ padding: theme.space[3] + 'px ' + theme.space[4] + 'px 0', color: theme.color.inkMuted, fontFamily: theme.font.mono, fontSize: theme.size.sm }));
const Tabs = styled.div(({ theme }) => ({ display: 'flex', gap: theme.space[2], padding: theme.space[3], flexShrink: 0 }));
const Tab = styled.button<{ $active: boolean }>(({ theme, $active }) => ({ flex: 1, padding: theme.space[3] + 'px ' + theme.space[2] + 'px', fontSize: theme.size.sm, border: '1px solid ' + ($active ? theme.color.primary : theme.color.primaryLineWeak), background: $active ? theme.color.primaryFill : theme.color.panel, color: $active ? theme.color.primarySoft : theme.color.inkMuted, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
const Hint = styled.div(({ theme }) => ({ padding: theme.space[3], borderTop: '1px solid ' + theme.color.primaryLineWeak, color: theme.color.inkMuted, fontSize: theme.size.sm, flexShrink: 0 }));
const Issues = styled.div(({ theme }) => ({ padding: theme.space[3], maxHeight: theme.space[8] + theme.space[3], overflow: 'auto', color: theme.color.danger, fontSize: theme.size.sm, lineHeight: 1.6, flexShrink: 0 }));
