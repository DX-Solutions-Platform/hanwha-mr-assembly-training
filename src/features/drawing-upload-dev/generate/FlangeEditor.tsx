import { useState } from 'react';
import styled from 'styled-components';
import type { Evidence } from '../types';
import { ReviewBody, ReviewHeader, ReviewPanel, ReviewTitle } from '../review/reviewStyles';
import { ActionButton, Muted } from '../ui/sharedStyles';
import { FLANGE_FIELD_LIST } from './flangeTypes';
import { FlangeParameterEditor } from './FlangeParameterEditor';
import { FlangePartEditor } from './FlangePartEditor';
import { FlangeDataView } from './FlangeDataView';
import type { useFlangeExample } from './useFlangeExample';
import { initialFlangeDraft } from './flangeModel';
import { AppearanceEditor } from '@/features/part-library/AppearanceEditor';
import { DEFAULT_APPEARANCE } from '@/features/part-library/modelAppearance';

export function FlangeEditor({ example, onInspect, lockIdentity }: { example: ReturnType<typeof useFlangeExample>; onInspect: (evidence: Evidence) => void; lockIdentity?: boolean }) {
  const [tab, setTab] = useState('dimensions');
  const state = example.state!;
  const initial = initialFlangeDraft(state.source).parameters;
  const changedCount = FLANGE_FIELD_LIST.filter(({ key }) => state.draft.parameters[key] !== initial[key]).length;
  const visibleIssues = state.source.outline && !state.isDirty ? [] : example.issues;
  const isBlocked = example.isLoading || example.isExporting;
  return <ReviewPanel aria-label="PDF 3D 입력값 편집">
    <ReviewHeader><ReviewTitle>입력값 검토·수정</ReviewTitle><Muted>치수 수정 {changedCount}개</Muted></ReviewHeader>
    <Tabs aria-label="생성 입력 보기">{[{ key: 'dimensions', label: '치수 7개' }, { key: 'part', label: '부품 정보' }, { key: 'appearance', label: '외관' }, { key: 'data', label: '입력 데이터' }].map((item) => <Tab key={item.key} aria-pressed={tab === item.key} $active={tab === item.key} onClick={() => setTab(item.key)}>{item.label}</Tab>)}</Tabs>
    <Body as="fieldset" disabled={isBlocked}>
      {tab === 'dimensions' && <FlangeParameterEditor draft={state.draft} source={state.source} onChange={example.update} onInspect={onInspect} />}
      {tab === 'part' && <FlangePartEditor draft={state.draft} source={state.source} onChange={example.update} onInspect={onInspect} lockIdentity={lockIdentity} />}
      {tab === 'appearance' && <AppearanceEditor appearance={state.appearance ?? DEFAULT_APPEARANCE} material={state.draft.part.material} onChange={example.updateAppearance} />}
      {tab === 'data' && <FlangeDataView state={state} />}
    </Body>
    {visibleIssues.length > 0 && <IssueList role="alert">{visibleIssues.map((issue) => <div key={issue}>{issue}</div>)}</IssueList>}
    <Apply><Muted>{state.source.outline ? '비어 있는 실제 치수와 부품 정보를 채운 뒤 확인하세요.' : '형상 유형: 원형 플랜지 · PDF 치수와 플랜지 규칙으로 생성합니다.'}</Muted><ActionButton $primary disabled={!example.canApply || isBlocked || !example.hasUnapplied} onClick={example.apply}>3D 다시 생성</ActionButton><ActionButton disabled={!!example.issues.length || example.hasUnapplied || isBlocked || state.status === 'confirmed'} onClick={example.confirm}>{state.status === 'confirmed' ? '검토 확정됨' : '이 모델 검토 확정'}</ActionButton></Apply>
  </ReviewPanel>;
}
const Tabs = styled.div(({ theme }) => ({ display: 'flex', gap: theme.space[2], padding: theme.space[3], flexShrink: 0 }));
const Tab = styled.button<{ $active: boolean }>(({ theme, $active }) => ({ flex: 1, padding: theme.space[3], background: $active ? theme.color.primaryFill : theme.color.panel, color: $active ? theme.color.primarySoft : theme.color.inkMuted, border: '1px solid ' + ($active ? theme.color.primary : theme.color.primaryLineWeak), fontSize: theme.size.sm, '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
const Body = styled(ReviewBody)(({ theme }) => ({ margin: 0, minWidth: 0, border: 0, padding: theme.space[4] }));
const Apply = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2], padding: theme.space[3], borderTop: '1px solid ' + theme.color.primaryLineWeak, flexShrink: 0, button: { minHeight: theme.space[6] + theme.space[2] } }));
const IssueList = styled.div(({ theme }) => ({ padding: theme.space[3], color: theme.color.danger, fontSize: theme.size.sm, lineHeight: 1.6, maxHeight: theme.space[8] + theme.space[4], overflow: 'auto', flexShrink: 0 }));
