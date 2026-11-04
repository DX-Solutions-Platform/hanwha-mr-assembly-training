import type { AssemblyState, AssemblyFeedback, AssemblyFrame, AssemblyReport } from './assemblyTypes';
export interface PracticeState extends AssemblyState {
  view: number; selectedPart: string | null;
  isPaused: boolean; isLayoutEditing: boolean; isRadialOpen: boolean; mode: 'practice' | 'eval';
  benchHeight: number; resetViewId: number; resetLayoutId: number;
}
export interface PracticePlacement { x: number; y: number; opacity: number; alignRight: boolean; }
export interface PracticeCallbacks {
  onSelectPart: (key: string | null) => void;
  onChangeView: (view: number) => void;
  onInfoPosition: (position: PracticePlacement) => void;
  onSectionPosition: (index: number, position: PracticePlacement) => void;
  onCoordinates: (name: string, text: string, position: PracticePlacement) => void;
  onHeightLoaded: (height: number) => void;
  onAssemblyChange: (patch: Partial<AssemblyState>) => void;
  onAssemblyFeedback: (feedback: AssemblyFeedback) => void;
  onAssemblyFrame: (frame: AssemblyFrame) => void;
  onAssemblyComplete: (report: AssemblyReport) => void;
}
