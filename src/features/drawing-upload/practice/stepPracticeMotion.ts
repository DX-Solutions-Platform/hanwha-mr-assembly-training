import type { StepBounds, VectorTuple } from '../../drawing-upload-dev/model/stepTypes';
import { tighten } from '../../training-practice/assemblyMath';
import { isBoltPart } from '../instructions/assemblyInstructions';
import { trayTravel, type TrayPoint } from './practiceTrayLayout';

export const PREPARATION_CENTER = 2.45;
const TRAY_LEFT = 1.36;
const TRAY_GAP = 0.18;
const TRAY_FRONT_PADDING = 0.24;

type TraySlot = { x: number; y: number; width: number; depth: number; height: number };
type TrayLimits = { left: number; right: number; halfDepth: number };
type TrayArea = { slots: TraySlot[]; limits: TrayLimits };
export type TrayPlacementIssue = 'outside' | 'occupied';

export function getPreparationOffset(model: StepBounds, part: StepBounds, scale: number, x = PREPARATION_CENTER, y = 0): VectorTuple {
  const partCenter = part.min.map((value, axis) => (value + part.max[axis] - model.min[axis] - model.max[axis]) * scale / 2);
  return [x - partCenter[0], y - partCenter[1], (model.min[2] - part.min[2]) * scale - 0.02];
}

export function layoutPracticeTray(model: StepBounds, bounds: readonly StepBounds[], scale: number, saved: readonly (TrayPoint | undefined)[] = [],
  { homeX = 0, movable = true } = {}) {
  const cells = bounds.map((part) => ({
    width: Math.max(0.28, (part.max[0] - part.min[0]) * scale) + TRAY_GAP,
    depth: Math.max(0.28, (part.max[1] - part.min[1]) * scale) + TRAY_GAP,
    height: Math.max(0.045, (part.max[2] - part.min[2]) * scale),
  }));
  const width = Math.max(2.18, ...cells.map((cell) => cell.width), Math.sqrt(cells.reduce((sum, cell) => sum + cell.width * cell.depth, 0)) * 1.18);
  let rowWidth = 0, rowDepth = 0, depth = 0;
  const positions = cells.map((cell) => {
    if (rowWidth && rowWidth + cell.width > width) {
      depth += rowDepth;
      rowWidth = 0;
      rowDepth = 0;
    }
    const x = TRAY_LEFT + rowWidth + cell.width / 2, y = depth + cell.depth / 2;
    rowWidth += cell.width;
    rowDepth = Math.max(rowDepth, cell.depth);
    return { ...cell, x, y };
  });
  depth += rowDepth;
  const defaults = positions.map((slot) => ({ ...slot, y: slot.y - depth / 2 }));
  const slots = defaults.map((slot, index) => saved[index] ? { ...slot, x: saved[index][0], y: saved[index][1] } : slot);
  const baseRight = TRAY_LEFT + width + 1.1;
  const halfDepth = depth / 2 + 0.85;
  const frameRight = baseRight + homeX + (movable ? trayTravel.maxX : 0);
  const frameHalfDepth = halfDepth + TRAY_FRONT_PADDING + (movable ? trayTravel.maxY : 0);
  const mapDepth = Math.max(12, (frameRight + 1.2) * 1.55, frameHalfDepth * 3);
  const mapWidth = mapDepth * (movable ? 1.5 : 1);
  const mapX = frameRight / 2 - 0.5;
  const editRight = movable ? Math.max(frameRight, mapX + mapWidth / 2 - TRAY_GAP) : frameRight;
  const limits = { left: TRAY_LEFT, right: baseRight + (editRight - frameRight), halfDepth };
  const tray = { limits, slots };
  const valid = slots.every(({ x, y }, index) => canPlacePracticeTraySlot(tray, index, [x, y]));
  return {
    limits,
    map: { x: mapX, width: mapWidth, depth: mapDepth },
    frame: { right: frameRight, editRight, halfDepth: frameHalfDepth },
    slots: (valid ? slots : defaults).map((slot, index) => ({
      ...slot, offset: getPreparationOffset(model, bounds[index], scale, slot.x, slot.y),
    })),
  };
}

export function getPracticeTraySurface(slots: readonly TraySlot[], preview?: { index: number; point: TrayPoint } | null) {
  if (!slots.length) return { x: TRAY_LEFT + 0.4, y: 0, width: 0.8, depth: 0.6 };
  const bounds = slots.reduce((area, slot, index) => {
    const [x, y] = preview?.index === index ? preview.point : [slot.x, slot.y];
    return {
      left: Math.min(area.left, x - slot.width / 2), right: Math.max(area.right, x + slot.width / 2),
      front: Math.min(area.front, y - slot.depth / 2), back: Math.max(area.back, y + slot.depth / 2),
    };
  }, { left: Infinity, right: -Infinity, front: Infinity, back: -Infinity });
  const front = bounds.front - TRAY_FRONT_PADDING;
  return { x: (bounds.left + bounds.right) / 2, y: (front + bounds.back) / 2,
    width: bounds.right - bounds.left, depth: bounds.back - front };
}

export function getPracticeWorkbench(model: StepBounds, work: StepBounds, scale: number) {
  const modelCenterX = (model.min[0] + model.max[0]) / 2;
  const minX = (work.min[0] - modelCenterX) * scale - 0.72;
  // Measure against the original tray edge so moving the box never changes the table size.
  const maxX = Math.min(TRAY_LEFT - 0.12, (work.max[0] - modelCenterX) * scale + 0.72);
  const x = ((work.min[0] + work.max[0]) / 2 - modelCenterX) * scale;
  const depth = (work.max[1] - work.min[1]) * scale + 1.20;
  const y = (work.min[1] + work.max[1] - model.min[1] - model.max[1]) * scale / 2;
  return { x, y, width: (maxX - minX) * 1.6, depth };
}

export function getPracticeTrayHomeX(workbench: ReturnType<typeof getPracticeWorkbench>) {
  return Math.max(0, workbench.x + workbench.width / 2 + TRAY_GAP - trayTravel.minX - TRAY_LEFT);
}

export function clampPracticeTraySlot(tray: TrayArea, index: number, [x, y]: TrayPoint): TrayPoint {
  const { width, depth } = tray.slots[index];
  const halfDepth = tray.limits.halfDepth - depth / 2;
  return [Math.max(tray.limits.left + width / 2, Math.min(tray.limits.right - width / 2, x)),
    Math.max(-halfDepth, Math.min(halfDepth, y))];
}

export function getSeatingClearance(bounds: StepBounds, scale: number) {
  const span = Math.max(...bounds.max.map((value, axis) => (value - bounds.min[axis]) * scale));
  return Math.max(0.036, Math.min(0.234, span * 0.24));
}

export function getPracticeFasteningFocus(model: StepBounds, point: VectorTuple, scale: number, boltSize: number): StepBounds {
  const halfSpan = Math.max(0.13, boltSize * 1.35) / scale;
  const center = point.map((value, axis) => value / scale + (model.min[axis] + model.max[axis]) / 2);
  return {
    min: center.map((value) => value - halfSpan) as VectorTuple,
    max: center.map((value) => value + halfSpan) as VectorTuple,
  };
}

export function canPlacePracticeTraySlot(tray: TrayArea, index: number, point: TrayPoint) {
  return getPracticeTrayPlacementIssue(tray, index, point) === null;
}

export function getPracticeTrayPlacementIssue(tray: TrayArea, index: number, [x, y]: TrayPoint): TrayPlacementIssue | null {
  const slot = tray.slots[index];
  const epsilon = 0.0001;
  if (x - slot.width / 2 < tray.limits.left - epsilon || x + slot.width / 2 > tray.limits.right + epsilon ||
    Math.abs(y) + slot.depth / 2 > tray.limits.halfDepth + epsilon) return 'outside';
  const occupied = tray.slots.some((other, at) => at !== index && Math.abs(other.x - x) < (other.width + slot.width) / 2 - epsilon &&
    Math.abs(other.y - y) < (other.depth + slot.depth) / 2 - epsilon);
  return occupied ? 'occupied' : null;
}

const finishes = [
  { color: '#7b828a', roughness: 0.42, metalness: 0.76 },
  { color: '#4a5158', roughness: 0.54, metalness: 0.55 },
  { color: '#70675a', roughness: 0.38, metalness: 0.72 },
  { color: '#626c74', roughness: 0.34, metalness: 0.80 },
  { color: '#44484c', roughness: 0.68, metalness: 0.24 },
  { color: '#746e65', roughness: 0.50, metalness: 0.64 },
  { color: '#939ba2', roughness: 0.30, metalness: 0.81 },
  { color: '#535a51', roughness: 0.53, metalness: 0.50 },
];

export function getPracticePartSurface(number: number, name = '') {
  const label = name.replace(/_/g, ' ');
  if (/\bpcb[a]?\b|기판/i.test(label)) return { color: '#304c40', roughness: 0.59, metalness: 0.12 };
  if (/\b(wire|cable|harness)\b|배선|전선|케이블/i.test(label)) return { color: '#393b3e', roughness: 0.79, metalness: 0.02 };
  if (/\b(switch|connector)\b|스위치|커넥터/i.test(label)) return { color: '#4b4e54', roughness: 0.62, metalness: 0.08 };
  if (isBoltPart(label) || /\b(nut|washer|spring)\b|너트|와셔|스프링/i.test(label)) {
    return { color: number % 2 ? '#727d86' : '#9a9da2', roughness: 0.30, metalness: 0.86 };
  }
  return finishes[(number - 1) % finishes.length];
}

function gripFactor(progress: number) {
  const seating = Math.max(0, (progress - 0.74) / 0.26);
  return 1 - 0.5 * seating ** 1.6;
}

export function advancePracticeTurn(progress: number, delta: number) {
  return tighten(progress, delta * gripFactor(progress));
}

export function getPracticeResistance(progress: number) {
  return 1 - (1 - tighten(progress, 0).resistance) * gripFactor(progress);
}
