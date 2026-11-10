import type { VectorTuple } from '../../drawing-upload-dev/model/stepTypes';
import { DEFAULT_PRACTICE_CARD_THEME, isPracticeCardTheme, type PracticeCardTheme } from './practiceCardThemes';

export type TrayPoint = [number, number];
export type PracticeTrayLayout = Record<string, TrayPoint>;
export type PracticeCardLayout = 'text' | 'image' | 'combined';
export type PracticeCardImage = { kind: 'during' | 'after' } | { kind: 'upload'; src: string };
export type PracticeCardSize = { width: number; height: number };
export type PracticeSceneCard = {
  layout: PracticeCardLayout;
  theme: PracticeCardTheme;
  title: string;
  text: string;
  image: PracticeCardImage | null;
  imageShare: number;
  position: VectorTuple;
  size: PracticeCardSize;
};
export type PracticeCardGeometry = Partial<Pick<PracticeSceneCard, 'position' | 'size'>>;
export type PracticeStageCards = Record<string, PracticeSceneCard>;
export type PracticeTraySettings = {
  positions: PracticeTrayLayout;
  trayOffsets: PracticeTrayLayout;
  captions: Record<string, string>;
  cards: Record<string, PracticeStageCards>;
};
export const trayTravel = { minX: -0.28, maxX: 1.1, maxY: 1.25 };
export const PRACTICE_CAPTION_LIMIT = 600;
export const PRACTICE_CARD_TITLE_LIMIT = 100;
export const PRACTICE_CARD_IMAGE_LIMIT = 200_000;
export const PRACTICE_CARD_IMAGE_SHARE = { min: 25, max: 75, default: 52 };
export const PRACTICE_CARD_SIZE = { minWidth: 156, maxWidth: 720, minHeight: 124, maxHeight: 560 };
export const DEFAULT_PRACTICE_CARD_SIZE: PracticeCardSize = { width: 260, height: 184 };
export const PRACTICE_LAYOUT_ENTRY_LIMIT = 2000;
export const PRACTICE_STAGE_CARD_LIMIT = 16;
const partKeyPattern = /^(?:part-\d+|group-\d+(?:-\d+)+)$/;
const cardIdPattern = /^[a-f0-9]{32}$/;

function isPracticePartKey(key: unknown): key is string {
  return typeof key === 'string' && key.length <= 5000 && partKeyPattern.test(key);
}

function readPositions(input: unknown, keyPattern: RegExp, isAllowed: (x: number, y: number) => boolean): PracticeTrayLayout | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const entries = Object.entries(input);
  if (entries.length > PRACTICE_LAYOUT_ENTRY_LIMIT) return null;
  const layout: PracticeTrayLayout = {};
  for (const [key, point] of entries) {
    if (key.length > 5000 || !keyPattern.test(key) || !Array.isArray(point) || point.length !== 2 ||
      point.some((coordinate) => typeof coordinate !== 'number' || !Number.isFinite(coordinate)) || !isAllowed(point[0], point[1])) return null;
    layout[key] = [point[0], point[1]];
  }
  return layout;
}

export function readPracticeTrayLayout(input: unknown) {
  return readPositions(input, partKeyPattern, (x, y) => Math.abs(x) <= 256 && Math.abs(y) <= 256);
}

export function readPracticeCaption(input: unknown) {
  if (!input || typeof input !== 'object' || !('key' in input) || !isPracticePartKey(input.key) ||
    !('text' in input) || typeof input.text !== 'string') return null;
  const text = input.text.trim();
  return text.length > 0 && text.length <= PRACTICE_CAPTION_LIMIT ? { key: input.key, text } : null;
}

function readCardPosition(input: unknown): VectorTuple | null {
  if (!Array.isArray(input) || input.length !== 3 || ![input[0], input[1], input[2]].every((value) =>
    typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 256)) return null;
  return [input[0], input[1], input[2]];
}

function readCardSize(input: unknown): PracticeCardSize | null {
  if (!input || typeof input !== 'object' || !('width' in input) || !('height' in input)) return null;
  const { width, height } = input;
  if (typeof width !== 'number' || !Number.isFinite(width) || width < PRACTICE_CARD_SIZE.minWidth || width > PRACTICE_CARD_SIZE.maxWidth ||
    typeof height !== 'number' || !Number.isFinite(height) || height < PRACTICE_CARD_SIZE.minHeight || height > PRACTICE_CARD_SIZE.maxHeight) return null;
  return { width, height };
}

export function clampPracticeCardSize({ width, height }: PracticeCardSize): PracticeCardSize {
  return {
    width: Math.round(Math.max(PRACTICE_CARD_SIZE.minWidth, Math.min(PRACTICE_CARD_SIZE.maxWidth, width))),
    height: Math.round(Math.max(PRACTICE_CARD_SIZE.minHeight, Math.min(PRACTICE_CARD_SIZE.maxHeight, height))),
  };
}

function readCardImage(input: unknown): PracticeCardImage | null {
  if (!input || typeof input !== 'object' || !('kind' in input)) return null;
  if (input.kind === 'during' || input.kind === 'after') return { kind: input.kind };
  if (input.kind === 'upload' && 'src' in input && typeof input.src === 'string' && input.src.length <= PRACTICE_CARD_IMAGE_LIMIT &&
    /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(input.src)) return { kind: 'upload', src: input.src };
  return null;
}

export function readPracticeSceneCard(input: unknown): PracticeSceneCard | null {
  if (!input || typeof input !== 'object' || !('position' in input)) return null;
  const position = readCardPosition(input.position);
  const size = 'size' in input ? readCardSize(input.size) : DEFAULT_PRACTICE_CARD_SIZE;
  const layout = 'layout' in input ? input.layout : 'text';
  const theme = 'theme' in input ? input.theme : DEFAULT_PRACTICE_CARD_THEME;
  if (!position || !size || !isPracticeCardTheme(theme) || (layout !== 'text' && layout !== 'image' && layout !== 'combined')) return null;
  const title = layout !== 'image' && 'title' in input && typeof input.title === 'string' ? input.title.trim() : '';
  const text = layout !== 'image' && 'text' in input && typeof input.text === 'string' ? input.text.trim() : '';
  const image = layout !== 'text' && 'image' in input ? readCardImage(input.image) : null;
  const imageShare = layout === 'combined' && 'imageShare' in input ? input.imageShare : PRACTICE_CARD_IMAGE_SHARE.default;
  if ((layout !== 'image' && !title && !text) || title.length > PRACTICE_CARD_TITLE_LIMIT || text.length > PRACTICE_CAPTION_LIMIT ||
    (layout !== 'text' && !image) || typeof imageShare !== 'number' || !Number.isFinite(imageShare) ||
    imageShare < PRACTICE_CARD_IMAGE_SHARE.min || imageShare > PRACTICE_CARD_IMAGE_SHARE.max) return null;
  return { layout, theme, title, text, image, imageShare, position, size };
}

export function readPracticeCardChange(input: unknown) {
  if (!input || typeof input !== 'object' || !('key' in input) || !isPracticePartKey(input.key) ||
    !('id' in input) || typeof input.id !== 'string' || !cardIdPattern.test(input.id)) return null;
  const { key, id } = input;
  if ('geometry' in input && input.geometry && typeof input.geometry === 'object') {
    const geometry: PracticeCardGeometry = {};
    if ('position' in input.geometry) {
      const position = readCardPosition(input.geometry.position);
      if (!position) return null;
      geometry.position = position;
    }
    if ('size' in input.geometry) {
      const size = readCardSize(input.geometry.size);
      if (!size) return null;
      geometry.size = size;
    }
    return geometry.position || geometry.size ? { key, id, geometry } as const : null;
  }
  if (!('card' in input)) return null;
  const keepGeometry = 'keepGeometry' in input && input.keepGeometry === true;
  if (input.card === null) return { key, id, card: null, keepGeometry };
  const card = readPracticeSceneCard(input.card);
  return card ? { key, id, card, keepGeometry } : null;
}

function readPracticeCards(input: unknown): PracticeTraySettings['cards'] | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const stages = Object.entries(input);
  if (stages.length > PRACTICE_LAYOUT_ENTRY_LIMIT) return null;
  const cards: PracticeTraySettings['cards'] = {};
  for (const [key, value] of stages) {
    if (!isPracticePartKey(key) || !value || typeof value !== 'object' || Array.isArray(value)) return null;
    const entries = Object.entries(value);
    if (entries.length > PRACTICE_STAGE_CARD_LIMIT) return null;
    const stage: PracticeStageCards = {};
    for (const [id, entry] of entries) {
      const card = readPracticeSceneCard(entry);
      if (!cardIdPattern.test(id) || !card) return null;
      stage[id] = card;
    }
    cards[key] = stage;
  }
  return cards;
}

function readPracticeCaptions(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const entries = Object.entries(input);
  if (entries.length > PRACTICE_LAYOUT_ENTRY_LIMIT) return null;
  const captions: Record<string, string> = {};
  for (const [key, text] of entries) {
    const caption = readPracticeCaption({ key, text });
    if (!caption) return null;
    captions[key] = caption.text;
  }
  return captions;
}

export function readPracticeTraySettings(input: unknown): PracticeTraySettings | null {
  if (!input || typeof input !== 'object' || !('positions' in input)) return null;
  const positions = readPracticeTrayLayout(input.positions);
  const trayOffsets = 'trayOffsets' in input ? readPositions(input.trayOffsets, /^(?:product|area-\d+(?:-\d+)*)$/,
    (x, y) => x >= trayTravel.minX && x <= trayTravel.maxX && Math.abs(y) <= trayTravel.maxY) : {};
  const captions = 'captions' in input ? readPracticeCaptions(input.captions) : {};
  const cards = 'cards' in input ? readPracticeCards(input.cards) : {};
  return positions && trayOffsets && captions && cards ? { positions, trayOffsets, captions, cards } : null;
}
