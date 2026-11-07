import type { DrawingPage, SourceRect } from '../../types';
import type { DraftSize, DrawingShape } from './draftGeometry';

export type DrawingPoint = [number, number];
export type BoxAnchors = [DrawingPoint, DrawingPoint, DrawingPoint, DrawingPoint];
export interface IsometricBlock { anchors: BoxAnchors; depthPercent: number; liftPercent: number; }
export interface IsometricDraft { pageNumber: number; blocks: IsometricBlock[]; }
export interface IsometricSolid { width: number; height: number; depth: number; x: number; y: number; z: number; }
export const ISOMETRIC_BLOCK_LIMIT = 12;

function measuredEdges(anchors: BoxAnchors, aspect: number) {
  const [corner, left, right, bottom] = anchors;
  const width = (corner[0] - left[0]) * aspect, depth = (right[0] - corner[0]) * aspect;
  const height = bottom[1] - corner[1];
  if (width < .009 || depth < .009 || height < .009 ||
      Math.abs(bottom[0] - corner[0]) * aspect > Math.max(.005, height * .1)) return null;
  const leftSlope = (corner[1] - left[1]) / width, rightSlope = (corner[1] - right[1]) / depth;
  if (Math.min(leftSlope, rightSlope) < .19 || Math.max(leftSlope, rightSlope) > 1.28 || leftSlope * rightSlope > .76) return null;
  return { width, height, depth, leftSlope, rightSlope };
}

function anchorBounds(blocks: IsometricBlock[]): SourceRect {
  const points = blocks.flatMap(({ anchors: [p, l, r, b] }) => [l, r, b, [l[0] + r[0] - p[0], l[1] + r[1] - p[1]]]);
  const x = Math.max(0, Math.min(...points.map(([x]) => x)));
  const y = Math.max(0, Math.min(...points.map(([, y]) => y)));
  return { x, y, width: Math.min(1, Math.max(...points.map(([x]) => x))) - x,
    height: Math.min(1, Math.max(...points.map(([, y]) => y))) - y };
}

export function buildIsometricDraft(page: Pick<DrawingPage, 'width' | 'height'>, draft: IsometricDraft): DrawingShape | null {
  if (!draft.blocks.length || draft.blocks.length > ISOMETRIC_BLOCK_LIMIT) return null;
  const aspect = page.width / page.height;
  const basis = measuredEdges(draft.blocks[0].anchors, aspect);
  if (!basis) return null;
  // The two projected horizontal axes determine the viewing azimuth and elevation.
  const { leftSlope, rightSlope } = basis;
  const sinElevation = Math.sqrt(leftSlope * rightSlope);
  const cosElevation = Math.sqrt(1 - sinElevation ** 2);
  const cosAzimuth = Math.sqrt(rightSlope / (leftSlope + rightSlope));
  const sinAzimuth = Math.sqrt(leftSlope / (leftSlope + rightSlope));
  const solids: IsometricSolid[] = [];
  for (const block of draft.blocks) {
    const edges = measuredEdges(block.anchors, aspect);
    if (!edges || Math.abs(edges.leftSlope - leftSlope) > .17 || Math.abs(edges.rightSlope - rightSlope) > .17) return null;
    const [corner] = block.anchors;
    const width = edges.width / cosAzimuth;
    const height = edges.height / cosElevation;
    const depth = edges.depth / sinAzimuth * block.depthPercent / 100;
    const lift = height * block.liftPercent / 100;
    const px = corner[0] * aspect, py = corner[1] + edges.height + lift * cosElevation;
    const nearX = cosAzimuth * px + sinAzimuth * py / sinElevation;
    const nearZ = -sinAzimuth * px + cosAzimuth * py / sinElevation;
    solids.push({ width, height, depth, x: nearX - width / 2, y: lift + height / 2, z: nearZ - depth / 2 });
  }
  const ranges = ([['x', 'width'], ['y', 'height'], ['z', 'depth']] as const).map(([axis, size]) => {
    const min = Math.min(...solids.map((item) => item[axis] - item[size] / 2));
    const max = Math.max(...solids.map((item) => item[axis] + item[size] / 2));
    return { axis, size, length: max - min, middle: (max + min) / 2 };
  });
  const proportions = {} as DraftSize;
  for (const { axis, size, length, middle } of ranges) {
    proportions[size] = length;
    for (const solid of solids) solid[axis] -= middle;
  }
  return {
    kind: 'isometric', draft, solids, proportions, pageNumber: draft.pageNumber, rect: anchorBounds(draft.blocks),
    cameraDirection: [sinAzimuth * cosElevation, sinElevation, cosAzimuth * cosElevation],
  };
}

export function parseIsometricDraft(value: unknown, pageCount: number): IsometricDraft | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { pageNumber, blocks } = value as IsometricDraft;
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount ||
    !Array.isArray(blocks) || !blocks.length || blocks.length > ISOMETRIC_BLOCK_LIMIT) return undefined;
  const valid = blocks.every((block) => block && Array.isArray(block.anchors) && block.anchors.length === 4 &&
    block.anchors.every((point) => Array.isArray(point) && point.length === 2 && point.every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) &&
    Number.isFinite(block.depthPercent) && block.depthPercent >= 10 && block.depthPercent <= 300 &&
    Number.isFinite(block.liftPercent) && block.liftPercent >= -300 && block.liftPercent <= 300);
  return valid ? { pageNumber, blocks } : undefined;
}
