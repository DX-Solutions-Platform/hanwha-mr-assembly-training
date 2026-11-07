import type { DrawingPage, SourceRect } from '../../types';
import { findComponents } from '../../shape-name/mountingPlateEvidence';
import type { DrawingShape } from './draftGeometry';
import { recognizeStepStool } from './recognizeStepStool';
import { readDrawingInk } from './drawingInk';

export async function readDrawingShape(page: DrawingPage, signal: AbortSignal, area?: SourceRect): Promise<DrawingShape | null> {
  const raster = await readDrawingInk(page, signal, area);
  if (!raster) return null;
  const { ink, width, height, crop } = raster;
  const components = findComponents(ink, width, height);
  const size = ({ left, right, top, bottom }: typeof components[number]) => (right - left) * (bottom - top);
  const bounds = components.reduce<typeof components[number] | null>((best, next) =>
    next.right - next.left >= 12 && next.bottom - next.top >= 9 && (!best || size(next) > size(best)) ? next : best, null);
  if (!bounds) return null;
  const { left, top } = bounds;
  const w = bounds.right - left + 1, h = bounds.bottom - top + 1;
  const mask = new Uint8Array(w * h);
  for (let row = 0; row < h; row++) mask.set(ink.subarray((top + row) * width + left, (top + row) * width + left + w), row * w);
  const profile = recognizeStepStool(mask, w, h);
  return profile && { kind: 'step-stool', profile, pageNumber: page.pageNumber, rect: { x: crop.x + left * crop.width / width, y: crop.y + top * crop.height / height, width: w * crop.width / width, height: h * crop.height / height } };
}

export async function readDrawingSelection(page: DrawingPage, area: SourceRect, signal: AbortSignal) {
  const selected = await readDrawingShape(page, signal, area);
  if (selected) return selected;
  // A crop can cut through the legs. Reuse the whole view only if it is the drawing the user selected.
  const full = await readDrawingShape(page, signal);
  if (!full) return null;
  const rect = full.rect;
  const width = Math.min(rect.x + rect.width, area.x + area.width) - Math.max(rect.x, area.x);
  const height = Math.min(rect.y + rect.height, area.y + area.height) - Math.max(rect.y, area.y);
  return width > rect.width * .65 && height > rect.height * .45 ? full : null;
}
