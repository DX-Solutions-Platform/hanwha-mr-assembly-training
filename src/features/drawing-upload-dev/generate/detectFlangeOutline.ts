import { findComponents } from '../shape-name/mountingPlateEvidence';
import type { SourceRect } from '../types';
import { stripFlangeAxisLines } from './stripFlangeAxisLines';

interface Circle { x: number; y: number; radius: number; }
export interface DetectedFlange { outer: Circle; bore: Circle; holes: Circle[]; pitchRadius: number; startAngle: number; }
const tau = 2 * Math.PI;
const distance = (a: Circle, b: Circle) => Math.hypot(a.x - b.x, a.y - b.y);
const angle = (outer: Circle, hole: Circle) => (Math.atan2(outer.y - hole.y, hole.x - outer.x) + tau) % tau;
const average = (list: number[]) => list.reduce((sum, value) => sum + value, 0) / list.length;

function circleCandidates(ink: Uint8Array, width: number, height: number) {
  const enclosed = ink.map((value) => 1 - value);
  const shapes = [
    ...findComponents(ink, width, height).map((bounds) => ({ ...bounds, isVoid: false })),
    ...findComponents(enclosed, width, height).map((bounds) => ({ ...bounds, isVoid: true })),
  ];
  const circles: Circle[] = [];
  for (const { left, right, top, bottom, isVoid } of shapes) {
    const w = right - left, h = bottom - top, radius = (w + h) / 4;
    if (Math.min(w, h) < 7 || Math.abs(w - h) > Math.max(2, radius * .14) || left === 0 || top === 0 || right === width - 1 || bottom === height - 1) continue;
    const x = (left + right) / 2, y = (top + bottom) / 2;
    const tolerance = Math.min(6, Math.max(2, Math.ceil(radius * .035)));
    let hits = 0;
    for (let index = 0; index < 48; index++) {
      const theta = tau * index / 48, dx = Math.cos(theta), dy = Math.sin(theta);
      for (let delta = -tolerance; delta <= tolerance; delta++) {
        const px = Math.round(x + dx * (radius + delta)), py = Math.round(y + dy * (radius + delta));
        if (px >= 0 && px < width && py >= 0 && py < height && ink[py * width + px]) { hits++; break; }
      }
    }
    if (hits < 42) continue;
    // The inside and outside of one printed stroke describe the same circle.
    const stroke = isVoid ? circles.find((circle) => Math.hypot(x - circle.x, y - circle.y) <= 2
      && circle.radius >= radius && circle.radius - radius <= 6) : undefined;
    if (stroke) {
      stroke.radius = (stroke.radius + radius) / 2;
      continue;
    }
    circles.push({ x, y, radius });
  }
  return circles;
}

function findPattern(outer: Circle, bore: Circle, circles: Circle[]): DetectedFlange | null {
  const inside = circles.filter((hole) => {
    const offset = distance(outer, hole);
    return offset - hole.radius > bore.radius + 1 && offset + hole.radius < outer.radius - 1;
  });
  const patterns: DetectedFlange[] = [];
  for (const anchor of inside) {
    const pitch = distance(outer, anchor);
    const holes = inside.filter((hole) => Math.abs(distance(outer, hole) - pitch) < Math.max(2, pitch * .045)
      && Math.abs(hole.radius - anchor.radius) < Math.max(1.8, anchor.radius * .16));
    if (holes.length < 3 || holes.length > 16) continue;
    const angles = holes.map((hole) => angle(outer, hole)).sort((a, b) => a - b);
    const spacing = tau / holes.length;
    const error = angles.some((value, index) => Math.abs((angles[index + 1] ?? angles[0] + tau) - value - spacing) > Math.min(.105, spacing * .16));
    if (error) continue;
    if (patterns.some((pattern) => holes.every((hole) => pattern.holes.includes(hole)) && pattern.holes.length === holes.length)) continue;
    patterns.push({ outer, bore, holes, pitchRadius: average(holes.map((hole) => distance(outer, hole))), startAngle: angles[0] * 180 / Math.PI });
  }
  if (patterns.length !== 1) return null;
  // Extra enclosed circles are evidence of a different shape or of more than one bolt circle.
  const pattern = patterns[0];
  return inside.every((hole) => pattern.holes.some((selected) => distance(hole, selected) <= 2)) ? pattern : null;
}

function findFlanges(ink: Uint8Array, width: number, height: number) {
  const circles = circleCandidates(ink, width, height);
  const flanges: DetectedFlange[] = [];
  for (const outer of circles.filter(({ radius }) => radius >= 30).sort((a, b) => b.radius - a.radius)) {
    if (flanges.some((flange) => distance(flange.outer, outer) < Math.max(2, outer.radius * .035))) continue;
    const bores = circles.filter((circle) => circle.radius > outer.radius * .08 && circle.radius < outer.radius * .85
      && distance(outer, circle) < Math.max(2.5, outer.radius * .025));
    if (bores.length !== 1) continue;
    const flange = findPattern(outer, bores[0], circles);
    if (flange) flanges.push(flange);
  }
  return flanges;
}

export function detectFlangeOutlines(ink: Uint8Array, width: number, height: number) {
  const flanges = findFlanges(ink, width, height);
  if (flanges.length) return flanges;
  const cleaned = stripFlangeAxisLines(ink, width, height);
  return cleaned ? findFlanges(cleaned, width, height) : [];
}

export function outlineRect(circles: Circle[], width: number, height: number): SourceRect {
  const left = Math.max(0, Math.min(...circles.map(({ x, radius }) => x - radius))), top = Math.max(0, Math.min(...circles.map(({ y, radius }) => y - radius)));
  const right = Math.min(width, Math.max(...circles.map(({ x, radius }) => x + radius))), bottom = Math.min(height, Math.max(...circles.map(({ y, radius }) => y + radius)));
  return { x: left / width, y: top / height, width: (right - left) / width, height: (bottom - top) / height };
}

export function outlineDimensions({ outer, bore, holes, pitchRadius, startAngle }: DetectedFlange, diameter: number, thickness: number) {
  const scaled = (radius: number) => Number((radius * diameter / outer.radius).toPrecision(6));
  return {
    outerDiameter: diameter, thickness, innerDiameter: scaled(bore.radius), pitchCircleDiameter: scaled(pitchRadius),
    holeDiameter: scaled(average(holes.map((hole) => hole.radius))), holeCount: holes.length,
    startAngle: Math.min(359.999, Number(startAngle.toFixed(2))),
  };
}
