export type ComplexModelId = 'airliner' | 'smartphone';
export type ComplexPhase = 'explode' | 'transition' | 'hud';

export interface ComplexState { modelId: ComplexModelId; phase: ComplexPhase; hoveredSectionIndex: number | null; selectedSectionIndex: number | null; isAssembled: boolean; isWireframe: boolean; }

export type ComplexAction =
  | { type: 'switchModel'; modelId: ComplexModelId } | { type: 'hoverSection'; sectionIndex: number | null } | { type: 'selectSection'; sectionIndex: number }
  | { type: 'clearSection' } | { type: 'setAssembled'; isAssembled: boolean } | { type: 'toggleWireframe' }
  | { type: 'startTraining' } | { type: 'enterHud' } | { type: 'exitHud' };

export const initialComplexState: ComplexState = { modelId: 'airliner', phase: 'explode', hoveredSectionIndex: null, selectedSectionIndex: null, isAssembled: false, isWireframe: false };

/** 2단계 분해: 전체 → 공정(8개) → 공정 안 부품 */
export function complexReducer(state: ComplexState, action: ComplexAction): ComplexState {
  switch (action.type) {
    case 'switchModel': return { ...initialComplexState, modelId: action.modelId };
    case 'hoverSection': return { ...state, hoveredSectionIndex: action.sectionIndex };
    case 'selectSection': return state.isAssembled ? state : { ...state, selectedSectionIndex: action.sectionIndex };
    case 'clearSection': return { ...state, selectedSectionIndex: null };
    case 'setAssembled': return { ...state, isAssembled: action.isAssembled, selectedSectionIndex: action.isAssembled ? null : state.selectedSectionIndex };
    case 'toggleWireframe': return { ...state, isWireframe: !state.isWireframe };
    case 'startTraining': return state.selectedSectionIndex !== null ? { ...state, phase: 'transition', isWireframe: false } : state;
    case 'enterHud': return state.phase === 'transition' ? { ...state, phase: 'hud' } : state;
    case 'exitHud': return { ...state, phase: 'explode', selectedSectionIndex: null };
    default: return state;
  }
}
