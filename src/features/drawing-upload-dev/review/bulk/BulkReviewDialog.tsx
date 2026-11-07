import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ActionButton, Muted, StateText } from '../../ui/sharedStyles';
import { useModalDialog } from '../../ui/useModalDialog';
import { getReviewIssues } from '../reviewModel';
import type { ReviewedPart, ReviewGroup } from '../reviewTypes';
import { buildBulkReviewPlan, type BulkReviewOptions } from './bulkReviewModel';
import { parseReviewImport, type ReviewImportResult } from './reviewImport';
import { BulkImportPanel } from './BulkImportPanel';
import { BulkCommonFields } from './BulkCommonFields';
import { BulkReviewTable } from './BulkReviewTable';

export function BulkReviewDialog({ groupList, partList, onApply, onConfirm, onClose }: {
  groupList: ReviewGroup[]; partList: ReviewedPart[]; onApply: (options: BulkReviewOptions) => void; onConfirm: (keys: string[]) => void; onClose: () => void;
}) {
  const modal = useModalDialog(onClose);
  const [selectedKeys, setSelectedKeys] = useState(() => partList.filter((part) => part.status === 'draft').map((part) => part.key));
  const [text, setText] = useState(''), [sourceName, setSourceName] = useState('공통값 입력');
  const [material, setMaterial] = useState(''), [quantity, setQuantity] = useState('');
  const [shouldOverwrite, setShouldOverwrite] = useState(false), [hasReviewedNoDimensions, setHasReviewedNoDimensions] = useState(false);
  const [fileError, setFileError] = useState('');
  const imported = useMemo<{ data: ReviewImportResult; error: string }>(() => {
    try { return { data: parseReviewImport(text), error: '' }; }
    catch (reason) { return { data: { rowList: [], warnings: [] }, error: reason instanceof Error ? reason.message : '부품표를 확인하세요.' }; }
  }, [text]);
  const options: BulkReviewOptions = { selectedKeys, rowList: imported.data.rowList, sourceName, material, quantity, shouldOverwrite, hasReviewedNoDimensions };
  const plan = buildBulkReviewPlan(groupList, partList, options);
  const previewList = partList.map((part) => plan.changes.find((change) => change.key === part.key)?.after ?? part);
  const readyKeys = partList.filter((part) => selectedKeys.includes(part.key) && part.status !== 'confirmed' && !getReviewIssues(part).length).map((part) => part.key);
  const error = fileError || imported.error;
  return <Dialog {...modal} aria-labelledby="bulk-review-title">
    <Header><div><h2 id="bulk-review-title">부품 정보 일괄 입력·확정</h2><Muted>{groupList.some((group) => group.recordList.some((record) => record.source.method)) ? 'OCR 인식값이 포함되어 있습니다. 숫자·재질·치수를 원문과 대조한 뒤 확정하세요.' : '도면에서 읽은 값은 자동 입력됩니다. 누락된 값은 부품표와 공통값으로 보완하세요.'}</Muted></div><ActionButton autoFocus onClick={onClose}>닫기</ActionButton></Header>
    <Body><BulkReviewTable groupList={groupList} partList={partList} previewList={previewList} selectedKeys={selectedKeys} onSelection={setSelectedKeys} /><Controls>
      <BulkImportPanel text={text} sourceName={sourceName} shouldOverwrite={shouldOverwrite} onText={(value, name) => { setText(value); setSourceName(name); }} onOverwrite={setShouldOverwrite} onError={setFileError} />
      <BulkCommonFields material={material} quantity={quantity} hasReviewedNoDimensions={hasReviewedNoDimensions} onMaterial={setMaterial} onQuantity={setQuantity} onNoDimensions={setHasReviewedNoDimensions} />
      {error && <StateText role="alert" $tone="danger">{error}</StateText>}
      {plan.unknownNumbers.length > 0 && <StateText $tone="warning">현재 도면에 없는 부품번호 {plan.unknownNumbers.length}종은 연결하지 않습니다: {plan.unknownNumbers.slice(0, 6).join(', ')}</StateText>}
      {[...imported.data.warnings, ...plan.warnings].map((warning) => <StateText key={warning} $tone="warning">{warning}</StateText>)}
    </Controls></Body>
    <Footer><Muted role="status">{plan.changes.length ? plan.changes.length + '종 변경 예정 · 적용 후 검토 확정할 수 있습니다.' : '확정 가능 ' + readyKeys.length + '종 · 필수값과 치수를 확인한 항목만 확정합니다.'} 브라우저 보관은 검토 결과 저장을 사용하세요.</Muted>
      {plan.changes.length ? <ActionButton $primary disabled={!!error || !!plan.warnings.length} onClick={() => onApply(options)}>{plan.changes.length}종 입력 적용</ActionButton> : <ActionButton $primary disabled={!!error || !!plan.warnings.length || !readyKeys.length} onClick={() => onConfirm(readyKeys)}>확정 가능한 {readyKeys.length}종 검토 확정</ActionButton>}
    </Footer>
  </Dialog>;
}
const Dialog = styled.dialog(({ theme }) => ({ width: 'min(96vw,' + theme.space[8] * 25 + 'px)', maxWidth: 'none', height: '90dvh', maxHeight: 'none', padding: theme.space[5], background: theme.color.bgMid, color: theme.color.ink, border: '1px solid ' + theme.color.primaryLine, fontFamily: theme.font.main, '&::backdrop': { background: theme.color.panelStrong }, '&[open]': { display: 'flex', flexDirection: 'column', gap: theme.space[4] } }));
const Header = styled.div(({ theme }) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.space[4], flexShrink: 0, h2: { margin: '0 0 ' + theme.space[2] + 'px', fontSize: theme.size.xl } }));
const Body = styled.div(({ theme }) => ({ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1.7fr) minmax(0,1fr)', gap: theme.space[5], '@media(max-width:1100px)': { display: 'flex', flexDirection: 'column', overflowY: 'auto', '& > section': { minHeight: theme.space[8] * 4, flexShrink: 0 } } }));
const Controls = styled.div(({ theme }) => ({ minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: theme.space[4], paddingRight: theme.space[2], '@media(max-width:1100px)': { overflowY: 'visible' } }));
const Footer = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'center', gap: theme.space[5], paddingTop: theme.space[4], borderTop: '1px solid ' + theme.color.primaryLineWeak, flexShrink: 0, '& > span': { flex: 1, minWidth: 0 }, button: { flexShrink: 0 }, '@media(max-width:700px)': { flexWrap: 'wrap' } }));
