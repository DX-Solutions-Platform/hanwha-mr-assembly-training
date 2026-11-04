'use client';
import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { findProduct } from '@/store/trainingStore';
import { useKeyPress } from '@/hooks/useKeyPress';
import { useVoiceGuide } from '@/hooks/useVoiceGuide';
import { hudReducer, initialHudState, type HudPhase } from './state/hudReducer';

interface HudControllerOption { productId: string; cardIndex: number; startPhase?: HudPhase; isEnabled?: boolean; }

/** 교육장 상태·키·음성 안내 — 모든 교육이 같은 기능을 쓰도록 하나로 묶음 */
export function useHudController({ productId, cardIndex, startPhase = 'preview', isEnabled = true }: HudControllerOption) {
  const product = useMemo(() => (productId ? findProduct(productId) : undefined), [productId]);
  const card = product?.cards[cardIndex] ?? product?.cards[0];
  const stepList = useMemo(() => card?.steps ?? [], [card]);
  const [hudState, dispatch] = useReducer(hudReducer, startPhase, (phase) => ({ ...initialHudState, phase }));
  const { isVoiceOn, toggleVoice, speak } = useVoiceGuide();
  const currentStep = stepList[hudState.stepIndex];

  useEffect(() => { if (isEnabled) dispatch({ type: 'reset', phase: startPhase }); }, [isEnabled, startPhase, productId, cardIndex]);
  useKeyPress('KeyV', () => isEnabled && dispatch({ type: 'openRadial' }), () => isEnabled && dispatch({ type: 'closeRadial' }));
  useKeyPress('Escape', () => isEnabled && dispatch({ type: 'togglePause' }));
  useKeyPress('KeyL', () => isEnabled && dispatch({ type: 'toggleLayoutEdit' }));

  useEffect(() => { if (isEnabled && hudState.phase === 'main' && currentStep) speak(currentStep.guide); }, [isEnabled, hudState.phase, currentStep, speak]);
  useEffect(() => { if (!hudState.mistakeMessage) return; const timerId = setTimeout(() => dispatch({ type: 'clearMistake' }), 2200); return () => clearTimeout(timerId); }, [hudState.mistakeMessage]);

  /** 거치대 도구로 작업 시도 — 틀린 도구면 이때 처음 알림 */
  const handleUseRestTool = useCallback(() => {
    if (!currentStep?.toolId || !hudState.restToolId) return;
    if (hudState.restToolId !== currentStep.toolId) { dispatch({ type: 'mistake', message: '도구가 맞지 않습니다' }); return; }
    dispatch({ type: 'nextStep', totalStepCount: stepList.length });
  }, [currentStep, hudState.restToolId, stepList.length]);

  return { product, card, stepList, currentStep, hudState, dispatch, isVoiceOn, toggleVoice, handleUseRestTool };
}

export type HudController = ReturnType<typeof useHudController>;
