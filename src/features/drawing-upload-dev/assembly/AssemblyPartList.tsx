import styled from 'styled-components';
import { ReviewHeader, ReviewPanel, ReviewTitle } from '../review/reviewStyles';
import { Muted, ScrollArea, StateText } from '../ui/sharedStyles';
import { KIND_LABEL, type AssemblyKind } from './assemblyTypes';
import { sameAssemblyParts } from './assemblyModel';
import type { useAssemblyEditor } from './useAssemblyEditor';

export function AssemblyPartList({ editor }: { editor: ReturnType<typeof useAssemblyEditor> }) {
  const document = editor.document!;
  const isLibrary = !!document.drawingSha256;
  const kinds = ['base', 'flange', 'bolt', 'nut'] as AssemblyKind[];
  const codes = isLibrary ? [...new Set(document.partList.map((part) => part.partNumber))] : kinds;
  return <ReviewPanel aria-label="조립품 부품 목록"><ReviewHeader><ReviewTitle>부품 · {codes.length}종</ReviewTitle><Muted>{document.partList.length}개</Muted></ReviewHeader>
    <Description>{isLibrary ? '같은 부품번호의 모델은 개별 번호로 선택합니다.' : '편집할 부품을 선택하세요. 볼트·너트는 번호로 고를 수 있습니다.'}</Description>
    <List>{codes.map((code) => {
      const parts = document.partList.filter((part) => (isLibrary ? part.partNumber : part.kind) === code).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      const active = parts.some((part) => part.id === editor.selected?.id);
      const label = isLibrary ? (parts.length > 1 ? parts[0].name.replace(/ 1$/, '') : parts[0].name) : KIND_LABEL[parts[0].kind];
      const changed = parts.some((part) => editor.pendingIds.includes(part.id) || !sameAssemblyParts([part], [editor.state!.baseline.partList.find((saved) => saved.id === part.id)!]));
      if (parts.length === 1) return <Group as="button" type="button" key={code} $active={active} data-assembly-part={parts[0].id} aria-label={parts[0].name + ' 선택'} aria-pressed={active} onClick={() => editor.select(parts[0].id)}>
        <Title><strong>{label}</strong><Muted>{active ? '선택됨' : '1개'}</Muted></Title><Code>{parts[0].partNumber}</Code>
        {changed && <StateText $tone="warning">{editor.pendingIds.includes(parts[0].id) ? '입력값 확인 필요' : '수정됨'}</StateText>}
      </Group>;
      return <Group key={code} $active={active}>
        <Title><strong>{label}</strong><Muted>{parts.length}개</Muted></Title><Code>{parts[0].partNumber}</Code>
        <Instances aria-label={label + ' 개별 선택'}>{parts.map((part, index) => <Instance key={part.id} data-assembly-part={part.id} aria-label={part.name + ' 선택'} aria-pressed={editor.state!.selectedId === part.id} $active={editor.state!.selectedId === part.id} $invalid={editor.pendingIds.includes(part.id)} onClick={() => editor.select(part.id)}>{index + 1}{editor.pendingIds.includes(part.id) && <span aria-hidden="true">!</span>}</Instance>)}</Instances>
        {changed && <StateText $tone="warning">{parts.some((part) => editor.pendingIds.includes(part.id)) ? '입력값 확인 필요' : '수정됨'}</StateText>}
      </Group>;
    })}</List>
  </ReviewPanel>;
}
const Description = styled.p(({ theme }) => ({ margin: 0, padding: theme.space[3], fontSize: theme.size.sm, color: theme.color.inkMuted, lineHeight: 1.6, flexShrink: 0 }));
const List = styled(ScrollArea)(({ theme }) => ({ flex: 1, padding: theme.space[3], paddingTop: 0 }));
const Group = styled.div<{ $active: boolean }>(({ theme, $active }) => ({ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: theme.space[2], padding: theme.space[4], marginBottom: theme.space[3], border: '1px solid ' + ($active ? theme.color.primary : theme.color.primaryLineWeak), background: $active ? theme.color.primaryFill : theme.color.panel, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft }, '&:is(button):hover': { background: theme.color.primaryFill } }));
const Title = styled.div(({ theme }) => ({ display: 'flex', justifyContent: 'space-between', gap: theme.space[2], strong: { minWidth: 0, overflowWrap: 'anywhere', fontSize: theme.size.md, fontWeight: theme.weight.medium } }));
const Code = styled.span(({ theme }) => ({ fontFamily: theme.font.mono, fontSize: theme.size.xs, color: theme.color.inkMuted, overflowWrap: 'anywhere' }));
const Instances = styled.div(({ theme }) => ({ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: theme.space[2], marginTop: theme.space[1] }));
const Instance = styled.button<{ $active: boolean; $invalid: boolean }>(({ theme, $active, $invalid }) => ({ position: 'relative', minHeight: theme.space[6] + theme.space[2], border: '1px solid ' + ($active ? theme.color.primary : $invalid ? theme.color.warning : theme.color.primaryLineWeak), background: $active ? theme.color.primary : theme.color.panel, color: $active ? theme.color.onPrimary : theme.color.ink, fontFamily: theme.font.mono, fontSize: theme.size.md, span: { position: 'absolute', right: theme.space[1], top: 0, color: theme.color.warning, fontSize: theme.size.xs }, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
