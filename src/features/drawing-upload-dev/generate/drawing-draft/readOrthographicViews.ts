import { findComponents, type InkComponent } from '../../shape-name/mountingPlateEvidence';
import type { DrawingPage } from '../../types';
import { readDrawingInk } from './drawingInk';
import { DRAWING_VIEWS, reconstructOrthographicHull, type DrawingView, type ViewMask, type ViewRegion, type ViewRegions } from './orthographicHull';
import type { DrawingShape } from './draftGeometry';
import { unionRect } from '../../textLayout';

const boxWidth = (bounds: InkComponent) => bounds.right - bounds.left + 1;
const boxHeight = (bounds: InkComponent) => bounds.bottom - bounds.top + 1;
const contains = (outer: InkComponent, inner: InkComponent, gap = 0) =>
  inner.left >= outer.left + gap && inner.right <= outer.right - gap &&
  inner.top >= outer.top + gap && inner.bottom <= outer.bottom - gap;

function enclosedStroke(labels: Int32Array, stride: number, component: InkComponent, id: number): ViewMask | null {
  const width = boxWidth(component), height = boxHeight(component), padded = width + 2;
  const buffer = new Uint8Array(padded * (height + 2)), queue = new Int32Array(buffer.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (labels[(component.top + y) * stride + component.left + x] === id) buffer[(y + 1) * padded + x + 1] = 1;
  }
  buffer[0] = 2;
  let length = 1;
  for (let index = 0; index < length; index++) {
    const current = queue[index], x = current % padded;
    const mark = (next: number) => { if (buffer[next] === 0) { buffer[next] = 2; queue[length++] = next; } };
    if (x > 0) mark(current - 1);
    if (x < padded - 1) mark(current + 1);
    mark(current - padded);
    mark(current + padded);
  }
  let inside = 0;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const state = buffer[(y + 1) * padded + x + 1];
    if (state === 0) inside++;
    mask[y * width + x] = state === 2 ? 0 : 1;
  }
  return inside >= mask.length * .10 ? { mask, width, height } : null;
}

type Raster = NonNullable<Awaited<ReturnType<typeof readDrawingInk>>>;
function rasterComponents(raster: Raster) {
  const labels = new Int32Array(raster.ink.length);
  const candidates = findComponents(raster.ink, raster.width, raster.height, labels)
    .map((box, index) => ({ box, id: index + 1, area: boxWidth(box) * boxHeight(box) }))
    .filter(({ box }) => boxWidth(box) >= 12 && boxHeight(box) >= 12)
    .sort((a, b) => b.area - a.area).slice(0, 36);
  return { labels, candidates };
}

function readSilhouette(raster: Raster) {
  const { labels, candidates } = rasterComponents(raster);
  const closed: { box: InkComponent; silhouette: ViewMask; subtract: boolean }[] = [];
  for (const { box, id, area } of candidates) {
    const parent = closed.findLast((entry) => contains(entry.box, box, 3));
    if (parent && area < parent.silhouette.mask.length * .008) continue;
    const silhouette = enclosedStroke(labels, raster.width, box, id);
    if (!silhouette) continue;
    if (parent) {
      // A nested independent loop is used as an opening only inside a filled outer region.
      const cx = Math.floor((box.left + box.right) / 2) - parent.box.left;
      const cy = Math.floor((box.top + box.bottom) / 2) - parent.box.top;
      if (!parent.silhouette.mask[cy * parent.silhouette.width + cx]) continue;
    }
    closed.push({ box, silhouette, subtract: !!parent && !parent.subtract });
  }
  if (!closed.length) return null;
  const left = Math.min(...closed.map(({ box }) => box.left)), top = Math.min(...closed.map(({ box }) => box.top));
  const width = Math.max(...closed.map(({ box }) => box.right)) - left + 1;
  const height = Math.max(...closed.map(({ box }) => box.bottom)) - top + 1;
  const mask = new Uint8Array(width * height);
  for (const { box, silhouette, subtract } of closed) {
    for (let y = 0; y < silhouette.height; y++) for (let x = 0; x < silhouette.width; x++) {
      if (silhouette.mask[y * silhouette.width + x]) mask[(box.top - top + y) * width + box.left - left + x] = subtract ? 0 : 1;
    }
  }
  return { mask, width, height };
}

const viewPatterns: { view: DrawingView; pattern: RegExp; leftSide?: boolean }[] = [
  { view: 'front', pattern: /^(?:FRONT(?: VIEW| ELEVATION)?|정면도|전면도)$/i },
  { view: 'top', pattern: /^(?:TOP(?: VIEW)?|PLAN VIEW|평면도|상면도)$/i },
  { view: 'side', pattern: /^(?:RIGHT(?: SIDE)?(?: VIEW| ELEVATION)?|우측면도)$/i },
  { view: 'side', pattern: /^(?:LEFT(?: SIDE)?(?: VIEW| ELEVATION)?|좌측면도)$/i, leftSide: true },
];

function regionsOverlap(a: ViewRegion, b: ViewRegion) {
  return a.pageNumber === b.pageNumber &&
    Math.min(a.rect.x + a.rect.width, b.rect.x + b.rect.width) - Math.max(a.rect.x, b.rect.x) > .002 &&
    Math.min(a.rect.y + a.rect.height, b.rect.y + b.rect.height) - Math.max(a.rect.y, b.rect.y) > .002;
}

export function readViewRegions(regions: Partial<ViewRegions>): ViewRegions | null {
  const { front, top, side } = regions;
  return front && top && side && !regionsOverlap(front, top) && !regionsOverlap(front, side) && !regionsOverlap(top, side) ? { front, top, side } : null;
}

export async function findLabeledViews(pages: DrawingPage[], signal: AbortSignal): Promise<ViewRegions | null> {
  const byPage = pages.map((page) => ({ page, titles: page.lineList.flatMap(({ tokenList }) => {
    const runs: (typeof tokenList)[] = [];
    for (const token of tokenList) {
      const run = runs.at(-1), last = run?.at(-1);
      if (run && last && token.rect.x - last.rect.x - last.rect.width < .026) run.push(token);
      else runs.push([token]);
    }
    return runs.flatMap((run) => {
      const text = run.map((token) => token.text).join(' ').trim().replace(/\s+/g, ' ');
      const match = viewPatterns.find(({ pattern }) => pattern.test(text));
      return match ? [{ ...match, rect: unionRect(run.map(({ rect }) => rect)) }] : [];
    });
  }) })).filter(({ titles }) => titles.length);
  const counts = DRAWING_VIEWS.map((view) => byPage.reduce((sum, { titles }) => sum + titles.filter((title) => title.view === view).length, 0));
  if (counts.some((count) => count !== 1)) return null;
  const regions: Partial<ViewRegions> = {};
  for (const { page, titles } of byPage) {
    const raster = await readDrawingInk(page, signal, undefined, 1200);
    if (!raster) return null;
    const { labels, candidates } = rasterComponents(raster);
    const { width, height } = raster;
    const diagrams = candidates.filter(({ box, id }) => boxWidth(box) >= 24 && boxHeight(box) >= 24 &&
      boxWidth(box) < width * .88 && boxHeight(box) < height * .88 &&
      enclosedStroke(labels, width, box, id));
    const outer = diagrams.filter(({ box }) => !diagrams.some((other) => other.box !== box && contains(other.box, box, 3)));
    for (const { view, rect, leftSide } of titles) {
      const x = (rect.x + rect.width / 2) * width, y = (rect.y + rect.height / 2) * height;
      const nearest = outer.map(({ box }) => {
        const dx = Math.abs((box.left + box.right) / 2 - x) / width;
        const dy = Math.max(box.top - y, y - box.bottom, 0) / height;
        return { box, score: dx * 1.9 + dy };
      }).sort((a, b) => a.score - b.score)[0];
      if (!nearest || nearest.score > .28) return null;
      const box = nearest.box, padding = 2;
      const left = Math.max(0, box.left - padding), top = Math.max(0, box.top - padding);
      regions[view] = { pageNumber: page.pageNumber, leftSide, rect: {
        x: left / width, y: top / height,
        width: (Math.min(width, box.right + padding + 1) - left) / width,
        height: (Math.min(height, box.bottom + padding + 1) - top) / height,
      } };
    }
  }
  return readViewRegions(regions);
}

export async function readOrthographicShape(pages: DrawingPage[], regions: ViewRegions, signal: AbortSignal): Promise<DrawingShape | null> {
  const masks: Partial<Record<DrawingView, ViewMask>> = {};
  for (const view of DRAWING_VIEWS) {
    const region = regions[view], page = pages.find((item) => item.pageNumber === region.pageNumber);
    if (!page) return null;
    const raster = await readDrawingInk(page, signal, region.rect, 900);
    const mask = raster && readSilhouette(raster);
    if (!mask) return null;
    masks[view] = mask;
  }
  const hull = reconstructOrthographicHull(masks as Record<DrawingView, ViewMask>, regions.side.leftSide);
  return hull && { kind: 'orthographic', hull, regions, pageNumber: regions.front.pageNumber, rect: regions.front.rect };
}
