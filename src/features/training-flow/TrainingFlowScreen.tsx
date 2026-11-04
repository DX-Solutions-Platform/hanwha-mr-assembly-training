'use client';
import { useMemo, useReducer, useState } from 'react';
import dynamic from 'next/dynamic';
import { Stage } from '@/components/common/Stage';
import { HorizonBackdrop } from '@/components/backdrop/HorizonBackdrop';
import { useProductList } from '@/store/trainingStore';
import { getModelSpec } from '@/data/models/modelRegistry';
import { useHudController } from '@/features/hud/useHudController';
import { HudUiLayer } from '@/features/hud/HudUiLayer';
import { flowReducer, initialFlowState } from './state/flowReducer';
import { createSceneBridge } from './state/sceneBridge';
import { FlowTopBar } from './ui/FlowTopBar';
import { useFlowKeys } from './useFlowKeys';
import { useFlowTimers } from './useFlowTimers';
import { useTestScenario } from './useTestScenario';
import { EducationSelectScreen } from '@/features/education-select/EducationSelectScreen';

// three.js는 클라이언트 전용 + 코드 분할
const FlowCanvas = dynamic(() => import('./scene/FlowCanvas').then((module) => module.FlowCanvas), { ssr: false });
const HudScene = dynamic(() => import('@/features/hud/scene/HudScene').then((module) => module.HudScene), { ssr: false });

/** 교육 선택 → 공정 선택 → 교육장 (한 화면에서 이어짐) */
export function TrainingFlowScreen() {
  const productList = useProductList();
  const [flowState, dispatch] = useReducer(flowReducer, initialFlowState);
  const [bridge] = useState(() => createSceneBridge(8));
  const { phase, activeIndex, selectedSectionIndex } = flowState;
  const activeProduct = activeIndex !== null ? productList[activeIndex] : null;
  const modelSpec = useMemo(() => (activeProduct ? getModelSpec(activeProduct.modelId) : null), [activeProduct]);
  const selectedSection = modelSpec && selectedSectionIndex !== null ? modelSpec.sectionList[selectedSectionIndex] : null;
  const isHud = phase === 'hud';
  const isPumpPreparation = activeProduct?.id === 'hydraulic-pump';
  const hudController = useHudController({ productId: activeProduct?.id ?? '', cardIndex: selectedSection?.cardIndex ?? 0, startPhase: isPumpPreparation ? 'placing' : 'safety', isEnabled: isHud && !isPumpPreparation });

  useFlowKeys(phase, selectedSectionIndex !== null, dispatch, phase !== 'focus' && phase !== 'explode');
  useFlowTimers(phase, dispatch, !isPumpPreparation); // 펌프는 안전 수칙·BOM 확인 후 진입합니다.
  useTestScenario(dispatch);

  const { hudState } = hudController;
  const scene = isHud
    ? <HudScene phase={hudState.phase} benchHeight={hudState.benchHeight} isLayoutEditing={hudState.isLayoutEditing} onExplodeDone={() => hudController.dispatch({ type: 'explodeDone' })} onPlacingDone={() => hudController.dispatch({ type: 'placingDone' })} />
    : <FlowCanvas productList={productList} flowState={flowState} dispatch={dispatch} bridge={bridge} />;

  if (phase === 'select' || phase === 'focus' || phase === 'explode' || ((phase === 'transition' || phase === 'hud') && isPumpPreparation)) {
    return <EducationSelectScreen productList={productList} flowState={flowState} dispatch={dispatch} hudController={hudController} />;
  }

  return (
    <Stage background={<HorizonBackdrop isFlat={phase === 'transition' || isHud} />} scene={scene}>
      {isHud ? <HudUiLayer controller={hudController} onExit={() => dispatch({ type: 'exitHud' })} /> : (
        <FlowTopBar isSelectPhase={false} productName={activeProduct?.name ?? ''} onBack={() => dispatch({ type: 'backToSelect' })} />
      )}
    </Stage>
  );
}
