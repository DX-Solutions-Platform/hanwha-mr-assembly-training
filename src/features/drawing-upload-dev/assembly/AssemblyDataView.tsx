import styled from 'styled-components';
import { Muted } from '../ui/sharedStyles';
import type { useAssemblyEditor } from './useAssemblyEditor';

export function AssemblyDataView({ editor }: { editor: ReturnType<typeof useAssemblyEditor> }) {
  const data = { ...editor.document, draftInputs: editor.state!.drafts, worldPositionsMm: editor.document!.partList.map((part) => ({ id: part.id, position: editor.matrices.get(part.id)!.elements.slice(12, 15) })) };
  return <Root><Muted>position은 결합점에서의 오프셋(자유 배치는 전체 좌표), rotation은 XYZ 각도입니다. worldPositionsMm은 현재 3D에 적용된 실제 위치입니다.</Muted><Data aria-label="조립품 입력 데이터" readOnly spellCheck={false} value={JSON.stringify(data, null, 2)} /></Root>;
}
const Root = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[3], flex: 1, minHeight: 0 }));
const Data = styled.textarea(({ theme }) => ({ flex: 1, width: '100%', minHeight: theme.space[8] * 4, resize: 'vertical', whiteSpace: 'pre', padding: theme.space[3], background: theme.color.bgEdge, border: '1px solid ' + theme.color.primaryLineWeak, color: theme.color.inkSub, fontFamily: theme.font.mono, fontSize: theme.size.sm, lineHeight: 1.6, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
