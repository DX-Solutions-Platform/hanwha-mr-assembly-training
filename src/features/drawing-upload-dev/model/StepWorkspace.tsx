import styled from 'styled-components';
import type { usePartReview } from '../review/usePartReview';
import type { useStepModel } from './useStepModel';
import { ReviewPartList } from '../review/ReviewPartList';
import { ReviewHeader, ReviewPanel, ReviewTitle } from '../review/reviewStyles';
import { ActionButton, Muted } from '../ui/sharedStyles';
import { StepViewer } from './StepViewer';
import { ModelBindingPanel } from './ModelBindingPanel';

export function StepWorkspace({ step, review, selectedKey, onSelectPart, onReview }: {
  step: ReturnType<typeof useStepModel>; review: ReturnType<typeof usePartReview>; selectedKey: string | null;
  onSelectPart: (key: string) => void; onReview: () => void;
}) {
  const current = review.current;
  const activeKey = current?.groupList.find((group) => group.key === selectedKey)?.key ?? current?.groupList[0]?.key ?? null;
  return <Root aria-label="STEP 부품 연결 작업 화면">
    {current?.groupList.length ? <ReviewPartList groupList={current.groupList} partList={current.partList} selectedKey={activeKey!} onSelect={onSelectPart} /> : <ReviewPanel><ReviewHeader><ReviewTitle>검토한 부품번호</ReviewTitle></ReviewHeader><Empty><Muted>먼저 PDF를 분석하고 부품 검토를 확정해 주세요. STEP 미리보기는 바로 사용할 수 있습니다.</Muted><ActionButton onClick={onReview}>PDF 분석으로</ActionButton></Empty></ReviewPanel>}
    <StepViewer key={step.model?.manifest.sha256 ?? 'empty'} step={step} />
    <ModelBindingPanel step={step} review={review} selectedKey={activeKey} />
  </Root>;
}
const Root = styled.div(({ theme }) => ({ position: 'absolute', left: theme.space[8], right: theme.space[8], top: theme.space[8] * 4 + theme.space[5], bottom: theme.space[8] + theme.space[5], display: 'grid', gridTemplateColumns: 'minmax(0,.65fr) minmax(0,1.6fr) minmax(0,1.25fr)', gap: theme.space[4] }));
const Empty = styled.div(({ theme }) => ({ padding: theme.space[4], display: 'flex', flexDirection: 'column', gap: theme.space[4] }));
