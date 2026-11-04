'use client';
import type { Dispatch } from 'react';
import { useKeyPress } from '@/hooks/useKeyPress';
import type { FlowAction, FlowPhase } from './state/flowReducer';

/** R 와이어프레임 · Esc 구간 선택 해제/교육 선택으로 */
export function useFlowKeys(phase: FlowPhase, hasSelectedSection: boolean, dispatch: Dispatch<FlowAction>) {
  useKeyPress('KeyR', () => dispatch({ type: 'toggleWireframe' }));
  useKeyPress('Escape', () => {
    if (phase !== 'explode') return;
    dispatch(hasSelectedSection ? { type: 'clearSection' } : { type: 'backToSelect' });
  });
}
