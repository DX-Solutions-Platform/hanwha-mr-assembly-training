import type * as Three from 'three';
import type { SelectionKind } from '@/features/education-select/selectionProducts';

export interface ProcessPart { object: Three.Object3D; basePosition: Three.Vector3; baseRotationY: number; offset: Three.Vector3; }
export interface ProcessItem { holder: Three.Group; spin: Three.Group; kind: SelectionKind; parts: ProcessPart[]; rotation: number; tilt: number; }
export interface ProcessState { activeIndex: number | null; selectedSection: number | null; hoveredSection: number | null; isReturning: boolean; isTransition: boolean; }
export interface ProcessLabelPlacement { x: number; y: number; points: string; opacity: string; lineOpacity: string; background: string; isVisible: boolean; }
export interface ProcessCallbacks {
  getState: () => ProcessState;
  onHoverSection: (index: number | null) => void;
  onSelectSection: (index: number) => void;
  onClearSection: () => void;
  onBack: () => void;
  isLabelHovered: () => boolean;
  isPanelTarget: (target: EventTarget | null) => boolean;
  onLabelPlacement: (index: number, placement: ProcessLabelPlacement) => void;
  onBackVisible: (visible: boolean) => void;
}
