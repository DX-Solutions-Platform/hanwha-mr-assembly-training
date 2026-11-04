'use client';
import { useEffect, type Dispatch } from 'react';
import type { FlowAction } from './state/flowReducer';

/**
 * 부하 테스트용 자동 진행 (?test=explode | ?test=hud)
 * scripts/load-test.mjs가 같은 화면 상태를 반복 측정할 수 있게 합니다
 */
export function useTestScenario(dispatch: Dispatch<FlowAction>) {
  useEffect(() => {
    const scenario = new URLSearchParams(window.location.search).get('test');
    if (!scenario) return;
    const timerList = [setTimeout(() => dispatch({ type: 'selectProduct', productIndex: 0 }), 600)];
    if (scenario === 'hud') {
      timerList.push(setTimeout(() => dispatch({ type: 'selectSection', sectionIndex: 2 }), 2200));
      timerList.push(setTimeout(() => dispatch({ type: 'startTraining' }), 2600));
    }
    return () => timerList.forEach(clearTimeout);
  }, [dispatch]);
}
