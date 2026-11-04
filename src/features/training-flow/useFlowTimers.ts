'use client';
import { useEffect, type Dispatch } from 'react';
import type { FlowAction, FlowPhase } from './state/flowReducer';
import { FOCUS_MS, TRANSITION_MS } from './state/flowTiming';

/** 포커싱 → 분해, 교육 시작 연출 → 교육장 */
export function useFlowTimers(phase: FlowPhase, dispatch: Dispatch<FlowAction>) {
  useEffect(() => {
    if (phase === 'focus') { const timerId = setTimeout(() => dispatch({ type: 'focusDone' }), FOCUS_MS); return () => clearTimeout(timerId); }
    if (phase === 'transition') { const timerId = setTimeout(() => dispatch({ type: 'enterHud' }), TRANSITION_MS); return () => clearTimeout(timerId); }
  }, [phase, dispatch]);
}
