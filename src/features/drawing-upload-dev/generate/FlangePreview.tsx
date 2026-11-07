import { useState } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { ReviewHeader, ReviewPanel, ReviewTitle } from '../review/reviewStyles';
import { ActionButton, Muted, StateText } from '../ui/sharedStyles';
import { StepPreviewBoundary } from '../model/StepPreviewBoundary';
import type { useFlangeExample } from './useFlangeExample';

const FlangeScene = dynamic(() => import('./FlangeScene'), { ssr: false, loading: () => <p>3D 예시를 준비하고 있습니다.</p> });
export function FlangePreview({ example }: { example: ReturnType<typeof useFlangeExample> }) {
  const [isWireframe, setIsWireframe] = useState(false);
  const [command, setCommand] = useState(0);
  const [previewKey, setPreviewKey] = useState(0);
  const state = example.state!;
  const p = state.applied.parameters;
  return <ReviewPanel aria-label="PDF 생성 3D 미리보기" data-model-status={state.isProportional ? 'proportional' : example.hasUnapplied ? 'pending' : state.status}>
    <ReviewHeader><ReviewTitle>{state.source.outline ? '윤곽으로 생성한 3D' : '치수로 생성한 3D'}</ReviewTitle><StateText $tone={state.status === 'confirmed' ? 'success' : 'warning'}>{state.isProportional ? '비율 초안' : example.hasUnapplied ? '입력값 확인' : state.status === 'confirmed' ? '검토 확정' : '초안 · 원문 대조 필요'}</StateText></ReviewHeader>
    <Info><strong>{state.applied.part.partNumber || '부품번호 미기재'} · {state.applied.part.name}</strong><Muted>{state.source.document.name} · {state.isProportional ? '실제 크기 입력 대기' : '단위 mm'} · 드래그 회전 · 휠 확대</Muted></Info>
    <Viewport aria-label="생성된 플랜지 3D 표시 영역">
      <StepPreviewBoundary key={previewKey} onRetry={() => setPreviewKey((value) => value + 1)}><FlangeScene values={state.applied} isWireframe={isWireframe} command={command} appearance={state.appearance} /></StepPreviewBoundary>
      {state.isProportional ? <Pending>정면도 비율로 그린 초안입니다. 실제 치수를 입력해 크기를 맞추세요.</Pending> : example.hasUnapplied && <Pending>마지막으로 생성한 모델입니다. 수정값은 3D 다시 생성으로 적용하세요.</Pending>}
    </Viewport>
    <Stats aria-label="생성 형상 치수">{state.isProportional ? <>
      <span>외경 기준 100%</span><span>중앙 구멍 {Number((p.innerDiameter / p.outerDiameter * 100).toFixed(1))}%</span>
      <span>{state.source.outline?.hasThickness ? '두께 ' + p.thickness + ' mm' : '미리보기용 두께'}</span><span>볼트 구멍 {p.holeCount}개</span>
    </> : <><span>외경 {p.outerDiameter} mm</span><span>중앙 Ø{p.innerDiameter}</span><span>두께 {p.thickness} mm</span><span>볼트 구멍 {p.holeCount}개 · Ø{p.holeDiameter}</span></>}</Stats>
    <Tools><SmallButton onClick={() => setCommand((value) => value + 1)}>시점 초기화</SmallButton><SmallButton aria-pressed={isWireframe} onClick={() => setIsWireframe((value) => !value)}>{isWireframe ? '면으로 보기' : '선으로 보기'}</SmallButton><SmallButton disabled={example.hasUnapplied || example.isExporting || example.isLoading} onClick={() => void example.exportGlb()}>{example.isExporting ? '내보내는 중' : '3D 내보내기 · GLB'}</SmallButton></Tools>
    <Note>중앙·볼트 관통 구멍을 표시합니다. 실제 재질과 선택한 외관을 모델에 함께 기록합니다.</Note>
  </ReviewPanel>;
}
const Info = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[2], padding: theme.space[4], fontSize: theme.size.base, overflowWrap: 'anywhere', flexShrink: 0 }));
const Viewport = styled.div(({ theme }) => ({ position: 'relative', flex: 1, minHeight: theme.space[8] * 3, background: theme.color.bgMid, overflow: 'hidden' }));
const Pending = styled.p(({ theme }) => ({ position: 'absolute', top: theme.space[3], left: theme.space[3], right: theme.space[3], margin: 0, padding: theme.space[3], color: theme.color.warning, background: theme.color.panelStrong, fontSize: theme.size.sm, lineHeight: 1.6, pointerEvents: 'none' }));
const Stats = styled.div(({ theme }) => ({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.space[2], padding: theme.space[4], borderTop: '1px solid ' + theme.color.primaryLineWeak, fontFamily: theme.font.mono, fontSize: theme.size.sm, flexShrink: 0 }));
const Tools = styled.div(({ theme }) => ({ display: 'flex', gap: theme.space[2], padding: '0 ' + theme.space[3] + 'px ' + theme.space[3] + 'px', flexShrink: 0 }));
const SmallButton = styled(ActionButton)(({ theme }) => ({ flex: 1, fontSize: theme.size.sm, minHeight: theme.space[6] + theme.space[2], padding: '0 ' + theme.space[2] + 'px' }));
const Note = styled.p(({ theme }) => ({ margin: 0, padding: theme.space[3], color: theme.color.inkMuted, fontSize: theme.size.sm, lineHeight: 1.6, borderTop: '1px solid ' + theme.color.primaryLineWeak, flexShrink: 0 }));
