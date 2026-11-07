import { useState } from 'react';
import styled from 'styled-components';
import type { DrawingPage, Evidence } from '../types';
import type { ReviewedPart, ReviewGroup } from './reviewTypes';
import { ReviewPartList } from './ReviewPartList';
import { ReviewDocument } from './ReviewDocument';
import { ReviewEditor } from './ReviewEditor';
import { BulkReviewDialog } from './bulk/BulkReviewDialog';
import type { BulkReviewOptions } from './bulk/bulkReviewModel';
import { canSuggestName, type ShapeNameRun } from '../shape-name/useShapeNames';
import type { ShapeArea } from '../shape-name/shapeNameTypes';

export function ReviewWorkspace({ groupList, partList, pageList, sourceUrl, onChange, onConfirm, onBulkApply, onConfirmMany, selectedKey: controlledKey, onSelectPart, shapeRun, onRetryWithAwq, onSuggestFromArea }: {
  groupList: ReviewGroup[]; partList: ReviewedPart[]; pageList: DrawingPage[]; sourceUrl: string | null;
  onChange: (key: string, patch: Partial<ReviewedPart>) => void; onConfirm: (key: string) => void;
  onBulkApply: (options: BulkReviewOptions) => void; onConfirmMany: (keys: string[]) => void;
  selectedKey?: string | null; onSelectPart?: (key: string) => void;
  shapeRun: ShapeNameRun | null; onRetryWithAwq: (key: string) => void;
  onSuggestFromArea?: (key: string, area: ShapeArea) => void;
}) {
  const [localKey, setSelectedKey] = useState(groupList[0]?.key ?? '');
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectingFor, setSelectingFor] = useState('');
  const selectedKey = controlledKey ?? localKey;
  const initialGroup = groupList.find((item) => item.key === selectedKey) ?? groupList[0];
  const initialSource = partList.find((part) => part.key === initialGroup?.key)?.shapeNameSuggestion?.source ?? initialGroup?.recordList[0]?.source;
  const [source, setSource] = useState<Evidence | null>(initialSource ?? null);
  const [pageNumber, setPageNumber] = useState(initialSource?.pageNumber ?? 1);
  const group = groupList.find((item) => item.key === selectedKey);
  const part = partList.find((item) => item.key === selectedKey);
  const canSuggest = !!(group && part && canSuggestName(group, part));
  const isSelecting = selectingFor === selectedKey && canSuggest && shapeRun?.status !== 'running';
  const handleInspect = (evidence: Evidence) => { setSource(evidence); setPageNumber(evidence.pageNumber); };
  const handleSelect = (key: string) => {
    setSelectingFor('');
    setSelectedKey(key); onSelectPart?.(key);
    const evidence = partList.find((item) => item.key === key)?.shapeNameSuggestion?.source ?? groupList.find((item) => item.key === key)?.recordList[0]?.source;
    if (evidence) handleInspect(evidence);
  };
  return <><Root aria-label="부품 검토 작업 화면">
    <ReviewPartList groupList={groupList} partList={partList} selectedKey={selectedKey} onSelect={handleSelect} heldKeys={shapeRun?.heldKeys} onBulk={() => setIsBulkOpen(true)} />
    <ReviewDocument pageList={pageList} pageNumber={pageNumber} source={source} sourceUrl={sourceUrl} onPageChange={(number) => { setPageNumber(number); setSource(null); }} shapeSelection={isSelecting && onSuggestFromArea ? {
      onChoose: (pageNumber, rect) => {
        setSelectingFor('');
        handleInspect({ pageNumber, rect, text: '직접 선택한 형상 영역' });
        onSuggestFromArea(selectedKey, { pageNumber, rect });
      },
      onCancel: () => setSelectingFor(''),
    } : undefined} />
    {group && part ? <ReviewEditor key={group.key} group={group} part={part} dimensionList={pageList.flatMap((page) => page.dimensionList)} onChange={(patch) => onChange(group.key, patch)} onConfirm={() => onConfirm(group.key)} onInspect={handleInspect} onRetryWithAwq={shapeRun?.heldKeys.includes(group.key) && canSuggest ? () => onRetryWithAwq(group.key) : undefined} onSelectShapeArea={onSuggestFromArea && canSuggest && !isSelecting ? () => setSelectingFor(group.key) : undefined} isAnalyzingShape={shapeRun?.status === 'running'} /> : <Empty>검토할 부품이 없습니다. 추출 화면에서 다른 PDF를 선택해 주세요.</Empty>}
  </Root>{isBulkOpen && <BulkReviewDialog groupList={groupList} partList={partList} onApply={onBulkApply} onConfirm={onConfirmMany} onClose={() => setIsBulkOpen(false)} />}</>;
}
const Root = styled.div(({ theme }) => ({ position: 'absolute', left: theme.space[8], right: theme.space[8], top: theme.space[8] * 4 + theme.space[5], bottom: theme.space[8] + theme.space[5], display: 'grid', gridTemplateColumns: 'minmax(0,.65fr) minmax(0,1.6fr) minmax(0,1.25fr)', gap: theme.space[4] }));
const Empty = styled.div(({ theme }) => ({ padding: theme.space[5], color: theme.color.inkMuted, fontSize: theme.size.md, lineHeight: 1.7 }));
