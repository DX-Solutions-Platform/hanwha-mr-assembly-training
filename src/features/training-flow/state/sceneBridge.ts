import { createScreenPointList, type ScreenPoint } from '@/types/scene';

/** 3D 장면 ↔ DOM 오버레이 공유 값 (매 프레임 setState 없이 ref로 전달) */
export interface SceneBridge { productPointList: ScreenPoint[]; sectionPointList: ScreenPoint[]; }

export function createSceneBridge(productCount: number, sectionCount = 12): SceneBridge {
  return { productPointList: createScreenPointList(productCount), sectionPointList: createScreenPointList(sectionCount) };
}
