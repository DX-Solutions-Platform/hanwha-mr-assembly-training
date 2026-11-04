'use client';
import { useMemo, useReducer, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Stage } from '@/components/common/Stage';
import { HorizonBackdrop } from '@/components/backdrop/HorizonBackdrop';
import { LeaderLabelList } from '@/components/overlay/LeaderLabelList';
import { InfoPanel } from '@/components/overlay/InfoPanel';
import { KeyHintLine } from '@/components/overlay/KeyHintLine';
import { useProductList } from '@/store/trainingStore';
import { getModelSpec } from '@/data/models/modelRegistry';
import { useHudController } from '@/features/hud/useHudController';
import { HudUiLayer } from '@/features/hud/HudUiLayer';
import { flowReducer, initialFlowState } from './state/flowReducer';
import { createSceneBridge } from './state/sceneBridge';
import { FlowTopBar } from './ui/FlowTopBar';
import { ShelfNameTag } from './ui/ShelfNameTag';
import { useFlowKeys } from './useFlowKeys';
import { useFlowTimers } from './useFlowTimers';
import { useTestScenario } from './useTestScenario';

// three.js는 클라이언트 전용 + 코드 분할
const FlowCanvas = dynamic(() => import('./scene/FlowCanvas').then((module) => module.FlowCanvas), { ssr: false });
const HudScene = dynamic(() => import('@/features/hud/scene/HudScene').then((module) => module.HudScene), { ssr: false });

const EXPLODE_HINT_LIST = ['휠 · 조립/분해', '드래그 · 회전', 'R · 선만 보기', 'F · 시점 초기화'];

/** 교육 선택 → 공정 선택 → 교육장 (한 화면에서 이어짐) */
export function TrainingFlowScreen() {
  const productList = useProductList();
  const [flowState, dispatch] = useReducer(flowReducer, initialFlowState);
  const bridgeRef = useRef(createSceneBridge(8));
  const sectionPointListRef = useRef(bridgeRef.current.sectionPointList);
  const productPointListRef = useRef(bridgeRef.current.productPointList);
  const { phase, activeIndex, hoveredIndex, selectedSectionIndex } = flowState;
  const activeProduct = activeIndex !== null ? productList[activeIndex] : null;
  const hoveredProduct = hoveredIndex !== null ? productList[hoveredIndex] : null;
  const modelSpec = useMemo(() => (activeProduct ? getModelSpec(activeProduct.modelId) : null), [activeProduct]);
  const selectedSection = modelSpec && selectedSectionIndex !== null ? modelSpec.sectionList[selectedSectionIndex] : null;
  const isHud = phase === 'hud';
  const hudController = useHudController({ productId: activeProduct?.id ?? '', cardIndex: selectedSection?.cardIndex ?? 0, startPhase: 'safety', isEnabled: isHud });

  useFlowKeys(phase, selectedSectionIndex !== null, dispatch);
  useFlowTimers(phase, dispatch);
  useTestScenario(dispatch);

  const { hudState } = hudController;
  const scene = isHud
    ? <HudScene phase={hudState.phase} benchHeight={hudState.benchHeight} isLayoutEditing={hudState.isLayoutEditing} onExplodeDone={() => hudController.dispatch({ type: 'explodeDone' })} onPlacingDone={() => hudController.dispatch({ type: 'placingDone' })} />
    : <FlowCanvas productList={productList} flowState={flowState} dispatch={dispatch} bridge={bridgeRef.current} />;

  return (
    <Stage background={<HorizonBackdrop isFlat={phase === 'transition' || isHud} />} scene={scene}>
      {isHud ? <HudUiLayer controller={hudController} onExit={() => dispatch({ type: 'exitHud' })} /> : (
        <>
          <FlowTopBar isSelectPhase={phase === 'select'} productName={activeProduct?.name ?? ''} onBack={() => dispatch({ type: 'backToSelect' })} />
          {phase === 'select' && <ShelfNameTag productName={hoveredProduct?.name ?? ''} caption={hoveredProduct ? `${hoveredProduct.cards.length} 공정` : ''} pointListRef={productPointListRef} productIndex={hoveredIndex} />}
          {phase === 'explode' && modelSpec && (
            <>
              <LeaderLabelList pointListRef={sectionPointListRef}
                itemList={modelSpec.sectionList.map((section, sectionIndex) => ({ key: section.code + section.name, code: section.code, title: section.name, isActive: sectionIndex === selectedSectionIndex || sectionIndex === flowState.hoveredSectionIndex }))}
                onSelect={(sectionIndex) => dispatch({ type: 'selectSection', sectionIndex })} onHover={(sectionIndex) => dispatch({ type: 'hoverSection', sectionIndex })} />
              {selectedSection && <InfoPanel code={selectedSection.code} title={selectedSection.name} caption={activeProduct?.cards[selectedSection.cardIndex]?.description ?? ''} chipList={selectedSection.summary.split(' · ')} actionLabel="교육 시작" onAction={() => dispatch({ type: 'startTraining' })} onClose={() => dispatch({ type: 'clearSection' })} />}
              <KeyHintLine hintList={EXPLODE_HINT_LIST} />
            </>
          )}
        </>
      )}
    </Stage>
  );
}
