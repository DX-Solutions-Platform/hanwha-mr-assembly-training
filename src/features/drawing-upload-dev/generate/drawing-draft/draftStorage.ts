import { DEFAULT_APPEARANCE, readModelAppearance, type ModelAppearance } from '@/features/part-library/modelAppearance';
import type { SourceRect } from '../../types';
import type { FlangePart } from '../flangeTypes';
import { DRAFT_AXES, type DraftAxis } from './draftGeometry';
import { DRAWING_VIEWS, type ViewRegion, type ViewRegions } from './orthographicHull';
import { parseIsometricDraft, type IsometricDraft } from './isometricDraft';

export interface DrawingDraftSettings {
  size: Record<DraftAxis, string>;
  sources: Partial<Record<DraftAxis, string>>;
  part: FlangePart;
  appearance: ModelAppearance;
  area?: { pageNumber: number; rect: SourceRect };
  viewRegions?: Partial<ViewRegions>;
  isometric?: IsometricDraft;
}
const key = (hash: string) => 'hanwha.drawing-draft.v1.' + hash;

function validRegion(value: unknown, pageCount: number): value is ViewRegion {
  if (!value || typeof value !== 'object') return false;
  const { pageNumber, rect } = value as ViewRegion;
  return Number.isInteger(pageNumber) && pageNumber > 0 && pageNumber <= pageCount && !!rect &&
    [rect.x, rect.y, rect.width, rect.height].every((field) => Number.isFinite(field) && field >= 0) &&
    rect.x + rect.width <= 1.000001 && rect.y + rect.height <= 1.000001 && rect.width > 0 && rect.height > 0;
}

export function readDrawingDraftSettings(hash: string, part: FlangePart, pageCount: number): DrawingDraftSettings {
  const initial = { size: { width: '', height: '', depth: '' }, sources: {}, part, appearance: DEFAULT_APPEARANCE };
  try {
    const stored = JSON.parse(localStorage.getItem(key(hash)) ?? 'null');
    if (!stored) return initial;
    const { size, sources, part: savedPart, appearance, area, version } = stored;
    if (!size || !DRAFT_AXES.every(({ key }) => typeof size[key] === 'string' && size[key].length < 30) ||
      !savedPart || !(['partNumber', 'name', 'material', 'quantity'] as const).every((field) => typeof savedPart[field] === 'string' && savedPart[field].length <= 200)) return initial;
    const viewRegions: Partial<ViewRegions> = {};
    for (const view of DRAWING_VIEWS) {
      const region: unknown = stored.viewRegions?.[view];
      if (validRegion(region, pageCount)) viewRegions[view] = { pageNumber: region.pageNumber, rect: region.rect, leftSide: region.leftSide === true };
    }
    const dimensionSources = Object.fromEntries(DRAFT_AXES.flatMap(({ key }) => typeof sources?.[key] === 'string' ? [[key, sources[key].slice(0, 250)]] : []));
    const isometric = parseIsometricDraft(stored.isometric, pageCount);
    // Earlier drafts used this field for the thickness of the silhouette.
    if (version !== 2) { size.depth = ''; delete dimensionSources.depth; }
    return { size, sources: dimensionSources, part: savedPart, appearance: readModelAppearance(appearance) ?? DEFAULT_APPEARANCE,
      ...(isometric ? { isometric } : {}), ...(validRegion(area, pageCount) ? { area } : {}), ...(Object.keys(viewRegions).length ? { viewRegions } : {}) };
  } catch { return initial; }
}
export function saveDrawingDraftSettings(hash: string, settings: DrawingDraftSettings) {
  localStorage.setItem(key(hash), JSON.stringify({ ...settings, version: 2 }));
}
