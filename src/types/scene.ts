/** 3D 좌표를 1920×1080 화면 좌표로 투영한 값 (DOM 라벨 배치용) */
export interface ScreenPoint { x: number; y: number; isVisible: boolean; }

export function createScreenPointList(count: number): ScreenPoint[] {
  return Array.from({ length: count }, () => ({ x: 0, y: 0, isVisible: false }));
}
