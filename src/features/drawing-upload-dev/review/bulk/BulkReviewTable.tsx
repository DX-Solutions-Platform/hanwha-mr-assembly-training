import styled from 'styled-components';
import type { ReviewedPart, ReviewGroup } from '../reviewTypes';
import { getReviewIssues } from '../reviewModel';
import { Muted, ScrollArea } from '../../ui/sharedStyles';

export function BulkReviewTable({ groupList, partList, previewList, selectedKeys, onSelection }: {
  groupList: ReviewGroup[]; partList: ReviewedPart[]; previewList: ReviewedPart[]; selectedKeys: string[]; onSelection: (keys: string[]) => void;
}) {
  const selected = new Set(selectedKeys);
  return <Root><Muted>선택 {selected.size}종 · 적용 전후 값을 확인하세요. PDF 추출값은 빈칸에 제안되며 임시 품명은 부품표의 품명으로 교체됩니다.</Muted><TableScroll><Table aria-label="일괄 부품 정보 미리보기"><thead><tr>
    <th><input aria-label="일괄 전체 부품 선택" type="checkbox" checked={!!groupList.length && selected.size === groupList.length} onChange={(event) => onSelection(event.target.checked ? groupList.map((group) => group.key) : [])} /></th>
    {['부품번호·검토 상태', '품명', '수량', '재질', '규격·비고'].map((label) => <th key={label}>{label}</th>)}
  </tr></thead><tbody>{groupList.map((group) => {
    const before = partList.find((part) => part.key === group.key)!, after = previewList.find((part) => part.key === group.key)!;
    const issues = getReviewIssues(after);
    return <tr key={group.key} data-bulk-part={group.key}>
      <td><input aria-label={'일괄 선택 ' + (group.partNumber || group.key)} type="checkbox" checked={selected.has(group.key)} onChange={(event) => onSelection(event.target.checked ? [...selectedKeys, group.key] : selectedKeys.filter((key) => key !== group.key))} /></td>
      <td><strong>{group.partNumber || '번호 미기재'}</strong><State $ready={!issues.length}>{after.status === 'confirmed' ? '확정됨' : issues.length ? issues[0] : '확정 가능'}</State></td>
      {(['name', 'quantity', 'material', 'specification'] as const).map((field) => <Cell key={field} $changed={before[field] !== after[field]}>{before[field] !== after[field] ? <><del>{before[field] || '빈칸'}</del><span>{after[field]}</span></> : after[field] || '—'}{field === 'name' && after.hasTemporaryName && <Muted>자동 임시 품명</Muted>}</Cell>)}
    </tr>;
  })}</tbody></Table></TableScroll></Root>;
}
const Root = styled.section(({ theme }) => ({ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: theme.space[3] }));
const TableScroll = styled(ScrollArea)(({ theme }) => ({ flex: 1, border: '1px solid ' + theme.color.primaryLineWeak }));
const Table = styled.table(({ theme }) => ({ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', textAlign: 'left', fontSize: theme.size.sm, lineHeight: 1.6, 'th,td': { padding: theme.space[2], borderBottom: '1px solid ' + theme.color.primaryLineWeak, verticalAlign: 'top', overflowWrap: 'anywhere' }, 'th:first-child,td:first-child': { width: theme.space[7] }, 'th:nth-child(4),td:nth-child(4)': { width: theme.space[8] }, th: { position: 'sticky', top: 0, background: theme.color.bgCenter, color: theme.color.primarySoft, fontWeight: theme.weight.medium }, input: { accentColor: theme.color.primary }, strong: { fontWeight: theme.weight.medium } }));
const State = styled.small<{ $ready: boolean }>(({ theme, $ready }) => ({ display: 'block', marginTop: theme.space[2], color: $ready ? theme.color.success : theme.color.warning, fontSize: theme.size.xs }));
const Cell = styled.td<{ $changed: boolean }>(({ theme, $changed }) => ({ background: $changed ? theme.color.primaryFill : 'transparent', color: $changed ? theme.color.primarySoft : theme.color.inkSub, del: { display: 'block', color: theme.color.inkMuted, fontSize: theme.size.xs }, span: { display: 'block' } }));
