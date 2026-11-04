'use client';
import type { Dispatch } from 'react';
import { useKeyPress } from '@/hooks/useKeyPress';
import type { FlowAction, FlowPhase } from './state/flowReducer';

/** R 와이어프레임 · Esc 구간 선택 해제/교육 선택으로 */
export function useFlowKeys(phase: FlowPhase, hasSelectedSection: boolean, dispatch: Dispatch<FlowAction>, isEnabled = true) {
  useKeyPress('KeyR', () => isEnabled && dispatch({ type: 'toggleWireframe' }));
  useKeyPress('Escape', () => {
    if (!isEnabled || phase !== 'explode') return;
    dispatch(hasSelectedSection ? { type: 'clearSection' } : { type: 'backToSelect' });
  });
}
