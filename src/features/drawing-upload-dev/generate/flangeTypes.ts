import type { DrawingPage, Evidence } from '../types';
import type { ReviewDocument } from '../review/reviewTypes';
import type { ModelAppearance } from '@/features/part-library/modelAppearance';

export const FLANGE_FIELD_LIST = [
  { key: 'outerDiameter', label: '외경', symbol: 'OD', unit: 'mm', min: 5, max: 2000 },
  { key: 'innerDiameter', label: '중앙 구멍 지름', symbol: 'ID', unit: 'mm', min: 1, max: 1999 },
  { key: 'thickness', label: '두께', symbol: 'THK', unit: 'mm', min: .1, max: 500 },
  { key: 'pitchCircleDiameter', label: '볼트 구멍 중심원 지름', symbol: 'PCD', unit: 'mm', min: 2, max: 1999 },
  { key: 'holeDiameter', label: '볼트 구멍 지름', symbol: 'HOLE_D', unit: 'mm', min: .1, max: 500 },
  { key: 'holeCount', label: '볼트 구멍 개수', symbol: 'HOLE_COUNT', unit: '개', min: 3, max: 16 },
  { key: 'startAngle', label: '첫 구멍 시작 각도', symbol: 'START_ANGLE', unit: '°', min: 0, max: 359.999 },
] as const;
export type FlangeField = typeof FLANGE_FIELD_LIST[number]['key'];
export type FlangeParameters = Record<FlangeField, number>;
export type FlangeInputs = Record<FlangeField, string>;
export interface FlangePart { partNumber: string; name: string; material: string; quantity: string; }
export interface FlangeValues { parameters: FlangeParameters; part: FlangePart; }
export interface FlangeDraft { parameters: FlangeInputs; part: FlangePart; }
export interface FlangeOutlineSource { key: string; hasDiameter: boolean; hasThickness: boolean; }
export interface FlangeSource {
  document: ReviewDocument; values: FlangeValues; evidence: Record<FlangeField, Evidence>;
  partEvidence: Evidence; pageList: DrawingPage[]; sourceUrl: string;
  outline?: FlangeOutlineSource;
}
export interface FlangeRecipe {
  format: 'hanwha-pdf-model'; schemaVersion: 1; template: 'flange-v1';
  document: ReviewDocument; values: FlangeValues; unit: 'mm';
  status: 'draft' | 'confirmed'; confirmedAt: string | null; savedAt: string;
  appearance?: ModelAppearance;
  source: { values: FlangeValues; evidence: Record<FlangeField, Evidence>; partEvidence: Evidence; outline?: FlangeOutlineSource };
}
export interface FlangeState {
  source: FlangeSource; draft: FlangeDraft; applied: FlangeValues;
  status: 'draft' | 'confirmed'; confirmedAt: string | null; isDirty: boolean;
  isProportional?: boolean;
  appearance?: ModelAppearance;
}
