import styled from 'styled-components';
import { CheckLabel, ReviewInput, ReviewLabel } from '../reviewStyles';
import { Muted } from '../../ui/sharedStyles';

export function BulkCommonFields({ material, quantity, hasReviewedNoDimensions, onMaterial, onQuantity, onNoDimensions }: {
  material: string; quantity: string; hasReviewedNoDimensions: boolean;
  onMaterial: (value: string) => void; onQuantity: (value: string) => void; onNoDimensions: (value: boolean) => void;
}) {
  return <Root><h3>선택 부품의 공통값</h3><Fields>
    <ReviewLabel>공통 재질<ReviewInput aria-label="일괄 공통 재질" maxLength={2000} value={material} placeholder="예: AL6061" onChange={(event) => onMaterial(event.target.value)} /></ReviewLabel>
    <ReviewLabel>공통 수량<ReviewInput aria-label="일괄 공통 수량" maxLength={100} inputMode="decimal" value={quantity} placeholder="같은 수량일 때만 입력" onChange={(event) => onQuantity(event.target.value)} /></ReviewLabel>
  </Fields><Muted>비워 둔 값은 바꾸지 않습니다. 공통값은 가져온 부품표보다 우선합니다.</Muted>
    <CheckLabel><input aria-label="일괄 원문 치수 없음 확인" type="checkbox" checked={hasReviewedNoDimensions} onChange={(event) => onNoDimensions(event.target.checked)} />선택한 부품은 원문에 치수가 기재되지 않았음을 확인했습니다.</CheckLabel>
    <Muted>치수 미연결 부품에만 적용합니다. 도면의 치수는 부품마다 확인 후 연결하세요.</Muted>
  </Root>;
}
const Root = styled.section(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[3], paddingTop: theme.space[4], borderTop: '1px solid ' + theme.color.primaryLineWeak, h3: { margin: 0, fontSize: theme.size.base, color: theme.color.primarySoft } }));
const Fields = styled.div(({ theme }) => ({ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: theme.space[3] }));
