import type { SourceRect } from '../../types';
import type { StepStoolProfile } from './recognizeStepStool';
import type { OrthographicHull, ViewRegions } from './orthographicHull';
import type { IsometricDraft, IsometricSolid } from './isometricDraft';

export type DrawingShape = { pageNumber: number; rect: SourceRect } & (
  { kind: 'step-stool'; profile: StepStoolProfile } |
  { kind: 'orthographic'; hull: OrthographicHull; regions: ViewRegions } |
  { kind: 'isometric'; draft: IsometricDraft; solids: IsometricSolid[]; proportions: DraftSize; cameraDirection: [number, number, number] }
);
export const DRAFT_AXES = [{ key: 'width', label: '가로' }, { key: 'height', label: '세로' }, { key: 'depth', label: '깊이' }] as const;
export type DraftAxis = typeof DRAFT_AXES[number]['key'];
export type DraftSize = Record<DraftAxis, number>;
export const drawingShapeKey = (shape: DrawingShape) => 'drawing:' + shape.pageNumber + ':' +
  [shape.rect.x, shape.rect.y, shape.rect.width, shape.rect.height].map((value) => Math.round(value * 1000)).join(':');

export function draftDisplaySize(values: Record<DraftAxis, string>, shape: DrawingShape | null): DraftSize {
  const proportions = shape?.kind === 'orthographic' ? shape.hull.proportions
    : shape?.kind === 'isometric' ? shape.proportions : { width: .82, height: 1, depth: .79 };
  const valid = (value: string) => { const number = Number(value); return number >= .1 && number <= 5000 ? number : 0; };
  const width = valid(values.width), height = valid(values.height), depth = valid(values.depth);
  const scale = (height && height / proportions.height) || (width && width / proportions.width) ||
    (depth && depth / proportions.depth) || 100 / Math.max(...Object.values(proportions));
  return { width: width || proportions.width * scale, height: height || proportions.height * scale, depth: depth || proportions.depth * scale };
}

export function readDraftSize(values: Record<DraftAxis, string>): DraftSize | null {
  const size = Object.fromEntries(DRAFT_AXES.map(({ key }) => [key, Number(values[key])])) as DraftSize;
  return DRAFT_AXES.every(({ key }) => size[key] >= .1 && size[key] <= 5000 && Number.isFinite(size[key])) ? size : null;
}

