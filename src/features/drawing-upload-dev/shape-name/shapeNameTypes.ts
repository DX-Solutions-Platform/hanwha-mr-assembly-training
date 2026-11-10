import type { Evidence, SourceRect } from '../types';

export const SHAPE_NAME_MODEL = 'qwen3-vl:8b';
export const AWQ_SHAPE_NAME_MODEL = 'soyrsoyr/Qwen3.8-27B-W4A16-AWQ-GPTQ';
export const DEFAULT_SHAPE_NAME_MODEL = AWQ_SHAPE_NAME_MODEL;
const PREVIOUS_AWQ_SHAPE_NAME_MODEL = 'cyankiwi/Qwen3.5-27B-AWQ-4bit';
export const SHAPE_NAME_API = '/api/drawing/shape-name';
export const MAX_SHAPE_IMAGE_LENGTH = 500_000;
export const SHAPE_NAME_LABEL = {
  flange: '플랜지',
  bolt: '볼트',
  nut: '너트',
  washer: '와셔',
  plate: '베이스판',
  shaft: '축',
} as const;

export type ShapeNameKind = keyof typeof SHAPE_NAME_LABEL;
export type ShapeNameModel = typeof SHAPE_NAME_MODEL | typeof AWQ_SHAPE_NAME_MODEL;
export type ShapeNameResult = { kind: ShapeNameKind | 'unknown'; reason: string };
export type ShapeArea = { pageNumber: number; rect: SourceRect };
export type ShapeNameSuggestion = {
  kind: ShapeNameKind;
  model: ShapeNameModel | typeof PREVIOUS_AWQ_SHAPE_NAME_MODEL;
  reason: string;
  source: Evidence;
  selectedArea?: true;
};

export function isShapeNameModel(value: unknown): value is ShapeNameModel {
  return value === SHAPE_NAME_MODEL || value === AWQ_SHAPE_NAME_MODEL;
}

export function isSavedShapeNameModel(value: unknown): value is ShapeNameSuggestion['model'] {
  return isShapeNameModel(value) || value === PREVIOUS_AWQ_SHAPE_NAME_MODEL;
}

export function shapeNameModelLabel(model: ShapeNameSuggestion['model']) {
  return {
    [AWQ_SHAPE_NAME_MODEL]: 'Qwen3.8 27B',
    [PREVIOUS_AWQ_SHAPE_NAME_MODEL]: 'Qwen3.5 27B AWQ',
    [SHAPE_NAME_MODEL]: 'Qwen 8B',
  }[model];
}

export function isShapeNameKind(value: unknown): value is ShapeNameKind {
  return typeof value === 'string' && Object.hasOwn(SHAPE_NAME_LABEL, value);
}

export function readShapeNameResult(value: unknown): ShapeNameResult | null {
  if (!value || typeof value !== 'object') return null;
  const { kind, reason } = value as Record<string, unknown>;
  if (!isShapeNameKind(kind) && kind !== 'unknown') return null;
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 240) return null;
  return { kind, reason: reason.trim() };
}
