import type { SourceRect } from '../../types';
import type { DraftSize } from './draftGeometry';

export const DRAWING_VIEWS = ['front', 'top', 'side'] as const;
export type DrawingView = typeof DRAWING_VIEWS[number];
export const VIEW_LABEL: Record<DrawingView, string> = { front: '정면도', top: '평면도', side: '측면도' };
export interface ViewRegion { pageNumber: number; rect: SourceRect; leftSide?: boolean; }
export type ViewRegions = Record<DrawingView, ViewRegion>;
export interface ViewMask { mask: Uint8Array; width: number; height: number; }
export interface OrthographicHull {
  cells: Uint8Array;
  grid: [number, number, number];
  proportions: DraftSize;
}

function sample(view: ViewMask, u: number, v: number) {
  return view.mask[Math.floor(v * view.height) * view.width + Math.floor(u * view.width)];
}

export function reconstructOrthographicHull(views: Record<DrawingView, ViewMask>, leftSide = false): OrthographicHull | null {
  const { front, top, side } = views;
  const width = front.width / front.height, fromTop = top.width / top.height, depth = side.width / side.height;
  // Independent views may use different scales. Their aspect ratios must still agree.
  if (Math.abs(Math.log(width / (fromTop * depth))) > .16) return null;
  const proportions = { width, height: 1, depth: Math.sqrt(depth * width / fromTop) };
  const scale = 96 / Math.max(...Object.values(proportions));
  const grid: OrthographicHull['grid'] = [width, 1, proportions.depth].map((length) => Math.max(2, Math.round(length * scale))) as OrthographicHull['grid'];
  const [nx, ny, nz] = grid;
  const cells = new Uint8Array(nx * ny * nz);
  const frontOn = new Uint8Array(nx * ny), topOn = new Uint8Array(nx * nz), sideOn = new Uint8Array(nz * ny);
  for (let y = 0; y < ny; y++) {
    const v = 1 - (y + .5) / ny;
    for (let x = 0; x < nx; x++) frontOn[y * nx + x] = sample(front, (x + .5) / nx, v);
    for (let z = 0; z < nz; z++) sideOn[y * nz + z] = sample(side, (leftSide ? z + .5 : nz - z - .5) / nz, v);
  }
  for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) topOn[z * nx + x] = sample(top, (x + .5) / nx, (z + .5) / nz);

  const seenFront = new Uint8Array(frontOn.length), seenTop = new Uint8Array(topOn.length), seenSide = new Uint8Array(sideOn.length);
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const f = y * nx + x, t = z * nx + x, s = y * nz + z;
    if (frontOn[f] && topOn[t] && sideOn[s]) {
      cells[(z * ny + y) * nx + x] = 1;
      seenFront[f] = seenTop[t] = seenSide[s] = 1;
    }
  }
  const count = (mask: Uint8Array) => mask.reduce((sum, value) => sum + value, 0);
  if ([{ expected: frontOn, actual: seenFront }, { expected: topOn, actual: seenTop }, { expected: sideOn, actual: seenSide }]
    .some(({ expected, actual }) => !count(expected) || count(actual) / count(expected) < .94)) return null;
  return { cells, grid, proportions };
}
