export type FlowPhase = 'select' | 'focus' | 'explode' | 'transition' | 'hud';

export interface FlowState {
  phase: FlowPhase;
  hoveredIndex: number | null;
  activeIndex: number | null;
  hoveredSectionIndex: number | null;
  selectedSectionIndex: number | null;
  isWireframe: boolean;
}

export type FlowAction =
  | { type: 'hoverProduct'; productIndex: number | null } | { type: 'selectProduct'; productIndex: number } | { type: 'focusDone' }
  | { type: 'hoverSection'; sectionIndex: number | null } | { type: 'selectSection'; sectionIndex: number } | { type: 'clearSection' }
  | { type: 'startTraining' } | { type: 'enterHud' } | { type: 'cancelPreparation' } | { type: 'exitHud' } | { type: 'backToSelect' } | { type: 'toggleWireframe' };

export const initialFlowState: FlowState = { phase: 'select', hoveredIndex: null, activeIndex: null, hoveredSectionIndex: null, selectedSectionIndex: null, isWireframe: false };

/** 교육 선택 → 공정 선택(분해) → 교육 시작(부품 날아감·지구 평평) → 교육장 — 화면 전환 없이 한 장면에서 진행 */
export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'hoverProduct': return state.phase === 'select' ? { ...state, hoveredIndex: action.productIndex } : state;
    case 'selectProduct': return state.phase === 'select' ? { ...state, phase: 'focus', activeIndex: action.productIndex, hoveredIndex: action.productIndex } : state;
    case 'focusDone': return state.phase === 'focus' ? { ...state, phase: 'explode' } : state;
    case 'hoverSection': return { ...state, hoveredSectionIndex: action.sectionIndex };
    case 'selectSection': return state.phase === 'explode' ? { ...state, selectedSectionIndex: action.sectionIndex } : state;
    case 'clearSection': return { ...state, selectedSectionIndex: null };
    case 'startTraining': return state.selectedSectionIndex !== null ? { ...state, phase: 'transition', isWireframe: false } : state;
    case 'enterHud': return state.phase === 'transition' ? { ...state, phase: 'hud' } : state;
    case 'cancelPreparation': return state.phase === 'transition' || state.phase === 'hud' ? { ...state, phase: 'explode', hoveredSectionIndex: null } : state;
    case 'exitHud': return { ...state, phase: 'explode', selectedSectionIndex: null, hoveredSectionIndex: null };
    case 'backToSelect': return { ...initialFlowState };
    case 'toggleWireframe': return state.phase === 'explode' ? { ...state, isWireframe: !state.isWireframe } : state;
    default: return state;
  }
}
