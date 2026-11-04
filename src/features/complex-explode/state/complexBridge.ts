import { createScreenPointList, type ScreenPoint } from '@/types/scene';

const MAX_PART_COUNT = 64;

/** 3D ↔ 라벨 공유 값 */
export interface ComplexBridge { sectionPointList: ScreenPoint[]; partPointList: ScreenPoint[]; exteriorPointList: ScreenPoint[]; }

export function createComplexBridge(): ComplexBridge {
  return { sectionPointList: createScreenPointList(12), partPointList: createScreenPointList(MAX_PART_COUNT), exteriorPointList: createScreenPointList(12) };
}
