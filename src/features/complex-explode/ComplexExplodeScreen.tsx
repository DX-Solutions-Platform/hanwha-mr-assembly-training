'use client';
import { useEffect, useMemo, useReducer, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styled from 'styled-components';
import { Stage } from '@/components/common/Stage';
import { HorizonBackdrop } from '@/components/backdrop/HorizonBackdrop';
import { LeaderLabelList } from '@/components/overlay/LeaderLabelList';
import { InfoPanel } from '@/components/overlay/InfoPanel';
import { KeyHintLine } from '@/components/overlay/KeyHintLine';
import { useKeyPress } from '@/hooks/useKeyPress';
import { getModelSpec } from '@/data/models/modelRegistry';
import { COMPLEX_PRODUCT_LIST } from '@/data/complexProducts';
import { cutCorner } from '@/styles/mixins';
import { useHudController } from '@/features/hud/useHudController';
import { HudUiLayer } from '@/features/hud/HudUiLayer';
import { complexReducer, initialComplexState } from './state/complexReducer';
import { createComplexBridge } from './state/complexBridge';
import { ModelSwitch } from './ui/ModelSwitch';
import { NearCursorPartLabels } from './ui/NearCursorPartLabels';

const ComplexScene = dynamic(() => import('./scene/ComplexScene').then((module) => module.ComplexScene), { ssr: false });
const HudScene = dynamic(() => import('@/features/hud/scene/HudScene').then((module) => module.HudScene), { ssr: false });

const HINT_LIST = ['휠 · 조립/분해', '드래그 · 회전', 'R · 선만 보기', 'Esc · 전체 보기'];
const TRANSITION_MS = 1800;

/** 여객기·스마트폰: 2단계 분해 → 공정 선택 → 교육장 (한 화면) */
export function ComplexExplodeScreen() {
  const [complexState, dispatch] = useReducer(complexReducer, initialComplexState);
  const bridgeRef = useRef(createComplexBridge());
  const sectionPointListRef = useRef(bridgeRef.current.sectionPointList);
  const partPointListRef = useRef(bridgeRef.current.partPointList);
  const exteriorPointListRef = useRef(bridgeRef.current.exteriorPointList);
  const { modelId, phase, selectedSectionIndex, hoveredSectionIndex, isAssembled } = complexState;
  const modelSpec = useMemo(() => getModelSpec(modelId), [modelId]);
  const product = COMPLEX_PRODUCT_LIST.find((item) => item.modelId === modelId);
  const selectedSection = selectedSectionIndex !== null ? modelSpec.sectionList[selectedSectionIndex] : null;
  const selectedPartList = useMemo(() => modelSpec.partList.filter((part) => part.sectionIndex === selectedSectionIndex).map((part) => ({ name: part.name, spec: part.spec ?? '' })), [modelSpec, selectedSectionIndex]);
  const isHud = phase === 'hud';
  const hudController = useHudController({ productId: product?.id ?? '', cardIndex: selectedSection?.cardIndex ?? 0, startPhase: 'safety', isEnabled: isHud });

  useKeyPress('KeyR', () => !isHud && dispatch({ type: 'toggleWireframe' }));
  useKeyPress('Escape', () => !isHud && dispatch({ type: 'clearSection' }));
  useEffect(() => { if (phase !== 'transition') return; const timerId = setTimeout(() => dispatch({ type: 'enterHud' }), TRANSITION_MS); return () => clearTimeout(timerId); }, [phase]);

  const { hudState } = hudController;
  const scene = isHud
    ? <HudScene phase={hudState.phase} benchHeight={hudState.benchHeight} isLayoutEditing={hudState.isLayoutEditing} onExplodeDone={() => hudController.dispatch({ type: 'explodeDone' })} onPlacingDone={() => hudController.dispatch({ type: 'placingDone' })} />
    : <ComplexScene complexState={complexState} dispatch={dispatch} bridge={bridgeRef.current} />;

  return (
    <Stage background={<HorizonBackdrop isFlat={phase !== 'explode'} />} scene={scene}>
      {isHud ? <HudUiLayer controller={hudController} onExit={() => dispatch({ type: 'exitHud' })} /> : (
        <>
          <TopLeft><BackLink href="/training">← 교육 선택</BackLink><ModelName>{product?.name}</ModelName></TopLeft>
          <ModelSwitch modelId={modelId} onChange={(nextModelId) => dispatch({ type: 'switchModel', modelId: nextModelId })} />
          {isAssembled
            ? <LeaderLabelList key={`${modelId}-exterior`} pointListRef={exteriorPointListRef} itemList={(modelSpec.exteriorList ?? []).map((exterior, exteriorIndex) => ({ key: exterior.name, code: `외관 ${String(exteriorIndex + 1).padStart(2, '0')}`, title: exterior.name }))} />
            : <LeaderLabelList key={`${modelId}-section`} pointListRef={sectionPointListRef}
                itemList={modelSpec.sectionList.map((section, sectionIndex) => ({ key: section.code, code: section.code, title: section.name, isActive: sectionIndex === hoveredSectionIndex }))}
                onSelect={(sectionIndex) => dispatch({ type: 'selectSection', sectionIndex })} onHover={(sectionIndex) => dispatch({ type: 'hoverSection', sectionIndex })} />}
          {selectedSection && <NearCursorPartLabels key={selectedSection.code} partList={selectedPartList} pointListRef={partPointListRef} />}
          {selectedSection && <InfoPanel code={selectedSection.code} title={selectedSection.name} caption={product?.cards[selectedSection.cardIndex]?.description ?? ''} chipList={selectedSection.summary.split(' · ')} actionLabel="교육 시작" onAction={() => dispatch({ type: 'startTraining' })} onClose={() => dispatch({ type: 'clearSection' })} />}
          <KeyHintLine hintList={HINT_LIST} />
        </>
      )}
    </Stage>
  );
}

const TopLeft = styled.div`position: absolute; left: 64px; top: 52px; display: flex; align-items: center; gap: 20px;`;
const BackLink = styled(Link)`
  display: inline-flex; align-items: center; height: 52px; padding: 0 18px; font-size: 16px; color: ${({ theme }) => theme.color.ink};
  background: rgba(10,8,6,.55); border: 1px solid rgba(243,115,33,.6); ${({ theme }) => cutCorner(theme.cut.sm)};
  &:hover { background: rgba(243,115,33,.2); color: ${({ theme }) => theme.color.ink}; }
`;
const ModelName = styled.span`font-size: ${({ theme }) => theme.size.xl}px; font-weight: ${({ theme }) => theme.weight.bold};`;
