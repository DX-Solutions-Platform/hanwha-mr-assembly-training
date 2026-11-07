import type { DrawingPage, SourceRect } from '../../types';
import { findComponents } from '../../shape-name/mountingPlateEvidence';
import { readDrawingInk } from './drawingInk';
import { buildIsometricDraft, ISOMETRIC_BLOCK_LIMIT, type BoxAnchors, type DrawingPoint, type IsometricBlock } from './isometricDraft';

export async function readIsometricDrawing(page: DrawingPage, signal: AbortSignal, area?: SourceRect) {
  const raster = await readDrawingInk(page, signal, area, 780);
  if (!raster) return null;
  const { ink, width, height, crop } = raster;
  const labels = new Int32Array(ink.length);
  const candidates = findComponents(ink, width, height, labels)
    .map((box, index) => ({ ...box, id: index + 1, area: (box.right - box.left) * (box.bottom - box.top) }))
    .filter(({ left, right, top, bottom }) => right - left >= 35 && bottom - top >= 27)
    .sort((a, b) => b.area - a.area).slice(0, 30);
  const blocks: IsometricBlock[] = [];
  for (const { id, left, right, top, bottom } of candidates) {
    signal.throwIfAborted();
    const border = 2, maxY = Math.round(top + (bottom - top) * .8);
    let leftY = -1, rightY = -1;
    for (let y = top; y <= maxY; y++) {
      for (let x = 0; x <= border; x++) {
        if (leftY === -1 && labels[y * width + left + x] === id) leftY = y;
        if (rightY === -1 && labels[y * width + right - x] === id) rightY = y;
      }
      if (leftY !== -1 && rightY !== -1) break;
    }
    if (leftY === -1 || rightY === -1) continue;
    const high: number[] = [];
    for (let x = left; x <= right; x++) if (labels[top * width + x] === id) high.push(x);
    const farX = high.reduce((sum, x) => sum + x, 0) / high.length;
    const p: DrawingPoint = [left + right - farX, leftY + rightY - top];
    const l: DrawingPoint = [left, leftY], r: DrawingPoint = [right, rightY], b: DrawingPoint = [p[0], bottom];
    const f: DrawingPoint = [farX, top], lb: DrawingPoint = [left, leftY + bottom - p[1]], rb: DrawingPoint = [right, rightY + bottom - p[1]];
    const score = (a: DrawingPoint, b: DrawingPoint) => {
      let hits = 0;
      for (let step = 0; step <= 22; step++) {
        const x = Math.round(a[0] + (b[0] - a[0]) * step / 22);
        const y = Math.round(a[1] + (b[1] - a[1]) * step / 22);
        let found = false;
        for (let dy = -3; dy <= 3 && !found; dy++) for (let dx = -3; dx <= 3; dx++) {
          if (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height && labels[(y + dy) * width + x + dx] === id) { found = true; break; }
        }
        if (found) hits++;
      }
      return hits / 23;
    };
    const edges = [[p, l], [p, r], [p, b], [l, f], [r, f], [l, lb], [r, rb], [b, lb], [b, rb]];
    if (edges.some(([a, b]) => score(a, b) < .87)) continue;
    const anchors = [p, l, r, b].map(([x, y]): DrawingPoint => [crop.x + x * crop.width / width, crop.y + y * crop.height / height]) as BoxAnchors;
    const block = { anchors, depthPercent: 100, liftPercent: 0 };
    if (!buildIsometricDraft(page, { pageNumber: page.pageNumber, blocks: [...blocks, block] })) continue;
    blocks.push(block);
    if (blocks.length === ISOMETRIC_BLOCK_LIMIT) break;
  }
  return buildIsometricDraft(page, { pageNumber: page.pageNumber, blocks });
}
