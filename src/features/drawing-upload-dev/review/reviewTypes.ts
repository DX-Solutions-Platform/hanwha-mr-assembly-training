import type { DimensionRecord, OcrPageInfo, PartRecord } from '../types';
import type { ReviewModelData } from '../model/stepTypes';
import type { ShapeNameSuggestion } from '../shape-name/shapeNameTypes';

export type ReviewField = 'name' | 'quantity' | 'material' | 'specification';
export const REVIEW_FIELD_LIST: { key: ReviewField; label: string }[] = [
  { key: 'name', label: '품명' }, { key: 'quantity', label: '수량' },
  { key: 'material', label: '재질' }, { key: 'specification', label: '규격·비고' },
];
export interface ReviewGroup {
  key: string;
  partNumber: string;
  recordList: PartRecord[];
  conflictFieldList: ReviewField[];
}
export interface ReviewedDimension {
  id: string;
  sourceId: string | null;
  value: string;
  unit: string;
}
export interface ReviewedPart {
  key: string;
  name: string;
  hasTemporaryName?: boolean;
  shapeNameSuggestion?: ShapeNameSuggestion;
  librarySource?: string;
  quantity: string;
  material: string;
  specification: string;
  note: string;
  dimensionList: ReviewedDimension[];
  hasNoDimensions: boolean;
  status: 'draft' | 'confirmed';
  confirmedAt: string | null;
}
export interface ReviewDocument {
  sha256: string;
  name: string;
  size: number;
  pageCount: number;
}
export interface ReviewPackage extends ReviewModelData {
  format: 'hanwha-part-review';
  schemaVersion: 2;
  document: ReviewDocument;
  savedAt: string;
  parts: (ReviewedPart & { partNumber: string; sourceRecordIdList: string[] })[];
  evidence: { partList: PartRecord[]; dimensionList: DimensionRecord[]; ocrPageList?: (OcrPageInfo & { pageNumber: number })[] };
}
