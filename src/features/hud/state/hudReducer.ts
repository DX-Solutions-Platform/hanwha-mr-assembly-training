export type HudPhase = 'preview' | 'explode' | 'safety' | 'bom' | 'placing' | 'main' | 'report';
export type TrainingMode = 'practice' | 'eval';

export interface HudState {
  phase: HudPhase; mode: TrainingMode; stepIndex: number; isPaused: boolean;
  isRadialOpen: boolean; hoveredToolId: string | null; restToolId: string | null; hasConfirmedToolSafety: boolean;
  mistakeMessage: string | null; mistakeCount: number; overTorqueCount: number; hintCount: number;
  isLayoutEditing: boolean; benchHeight: number; startedAt: number;
}

export type HudAction =
  | { type: 'startTraining' } | { type: 'explodeDone' } | { type: 'confirmSafety' } | { type: 'proceedBom' } | { type: 'placingDone' }
  | { type: 'nextStep'; totalStepCount: number } | { type: 'setMode'; mode: TrainingMode } | { type: 'togglePause' }
  | { type: 'openRadial' } | { type: 'closeRadial' } | { type: 'hoverTool'; toolId: string | null }
  | { type: 'pickTool'; toolId: string } | { type: 'confirmToolSafety' }
  | { type: 'mistake'; message: string } | { type: 'overTorque' } | { type: 'clearMistake' } | { type: 'useHint' }
  | { type: 'toggleLayoutEdit' } | { type: 'setBenchHeight'; benchHeight: number } | { type: 'reset'; phase: HudPhase };

export const initialHudState: HudState = {
  phase: 'preview', mode: 'practice', stepIndex: 0, isPaused: false,
  isRadialOpen: false, hoveredToolId: null, restToolId: null, hasConfirmedToolSafety: false,
  mistakeMessage: null, mistakeCount: 0, overTorqueCount: 0, hintCount: 0,
  isLayoutEditing: false, benchHeight: 0, startedAt: 0,
};

export function hudReducer(state: HudState, action: HudAction): HudState {
  switch (action.type) {
    case 'startTraining': return { ...state, phase: 'explode' };
    case 'explodeDone': return { ...state, phase: 'safety' };
    case 'confirmSafety': return { ...state, phase: 'bom' };
    case 'proceedBom': return { ...state, phase: 'placing' };
    case 'placingDone': return { ...state, phase: 'main', startedAt: Date.now() };
    case 'nextStep': return action.totalStepCount - 1 <= state.stepIndex ? { ...state, phase: 'report' } : { ...state, stepIndex: state.stepIndex + 1 };
    case 'setMode': return { ...state, mode: action.mode };
    case 'togglePause': return { ...state, isPaused: !state.isPaused, isRadialOpen: false };
    case 'openRadial': return state.phase === 'main' && !state.isPaused ? { ...state, isRadialOpen: true } : state;
    case 'closeRadial': return { ...state, isRadialOpen: false, hoveredToolId: null };
    case 'hoverTool': return { ...state, hoveredToolId: action.toolId };
    // 고를 때는 정답 여부를 표시하지 않음 → 거치대에 그대로 놓임
    case 'pickTool': return { ...state, restToolId: action.toolId, isRadialOpen: false, hoveredToolId: null };
    case 'confirmToolSafety': return { ...state, hasConfirmedToolSafety: true };
    case 'mistake': return { ...state, mistakeMessage: action.message, mistakeCount: state.mistakeCount + 1 };
    case 'overTorque': return { ...state, mistakeMessage: '과체결 · 규정 토크를 초과했습니다', overTorqueCount: state.overTorqueCount + 1 };
    case 'clearMistake': return { ...state, mistakeMessage: null };
    case 'useHint': return { ...state, hintCount: state.hintCount + 1 };
    case 'toggleLayoutEdit': return { ...state, isLayoutEditing: !state.isLayoutEditing };
    case 'setBenchHeight': return { ...state, benchHeight: action.benchHeight };
    case 'reset': return { ...initialHudState, phase: action.phase, mode: state.mode };
    default: return state;
  }
}
