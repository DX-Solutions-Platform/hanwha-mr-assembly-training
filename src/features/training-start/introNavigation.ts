export const INTRO_EXIT_MS = 160;
export const INTRO_ENTER_MS = 320;

export interface IntroNavigationState {
  index: number;
  target: number;
  phase: 'idle' | 'leaving' | 'entering';
  direction: number;
}
type IntroNavigationAction = { type: 'move'; delta: number; isImmediate?: boolean } | { type: 'exitDone' } | { type: 'enterDone' };
const clamp = (index: number) => Math.max(0, Math.min(5, index));

export function createIntroNavigation(index: number): IntroNavigationState {
  return { index: clamp(index), target: clamp(index), phase: 'idle', direction: 1 };
}

/** 전환 중 입력도 목표 단계에 누적하고, 화면은 한 단계씩 차례로 표시합니다. */
export function introNavigationReducer(state: IntroNavigationState, action: IntroNavigationAction): IntroNavigationState {
  if (action.type === 'move') {
    const target = clamp(state.target + action.delta);
    if (action.isImmediate) return { index: target, target, phase: 'idle', direction: Math.sign(action.delta) || 1 };
    if (target === state.target) return state;
    return state.phase === 'idle'
      ? { ...state, target, phase: 'leaving', direction: Math.sign(target - state.index) }
      : { ...state, target };
  }
  if (action.type === 'exitDone') {
    if (state.target === state.index) return { ...state, phase: 'idle' };
    const direction = Math.sign(state.target - state.index);
    return { ...state, index: state.index + direction, phase: 'entering', direction };
  }
  return state.index === state.target
    ? { ...state, phase: 'idle' }
    : { ...state, phase: 'leaving', direction: Math.sign(state.target - state.index) };
}
