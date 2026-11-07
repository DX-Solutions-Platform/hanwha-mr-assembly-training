import styled from 'styled-components';
import { Muted } from '../ui/sharedStyles';
import { flangeHoleCenters, parseFlangeDraft, toFlangeDraft } from './flangeModel';
import { createFlangeRecipe } from './flangePersistence';
import type { FlangeState } from './flangeTypes';

export function FlangeDataView({ state }: { state: FlangeState }) {
  const applied = toFlangeDraft(state.applied);
  const recipe = state.isProportional || !parseFlangeDraft(applied).values ? { values: state.applied, outline: state.source.outline } : createFlangeRecipe({ ...state, draft: applied });
  const data = { ...recipe, draftInputs: state.draft, [state.isProportional ? 'previewHoleCenters' : 'derivedHoleCentersMm']: flangeHoleCenters(state.applied.parameters) };
  return <Root><Muted>values는 현재 3D에 적용된 값, source는 PDF 원문, draftInputs는 수정 중인 입력값입니다. 구멍 좌표는 중심원 지름·개수·각도로 계산합니다.</Muted><Data aria-label="3D 생성 입력 데이터" readOnly value={JSON.stringify(data, null, 2)} spellCheck={false} /></Root>;
}
const Root = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[3], flex: 1, minHeight: 0 }));
const Data = styled.textarea(({ theme }) => ({ width: '100%', flex: 1, minHeight: theme.space[8] * 5, padding: theme.space[3], resize: 'vertical', border: '1px solid ' + theme.color.primaryLineWeak, background: theme.color.bgEdge, color: theme.color.inkSub, fontFamily: theme.font.mono, fontSize: theme.size.sm, lineHeight: 1.6, whiteSpace: 'pre', '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
