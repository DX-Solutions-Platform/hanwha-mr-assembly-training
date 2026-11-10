import { Vector3 } from 'three';
import type { StepBounds, StepPick, VectorTuple } from '../../drawing-upload-dev/model/stepTypes';

export type PracticeToolKind = 'hex-key' | 'torx' | 'phillips' | 'slotted' | 'socket' | 'driver';

function namedTool(name: string): PracticeToolKind | undefined {
  const words = name.replace(/_/g, ' ');
  if (/\b(?:socket wrench|ratchet)\b|소켓|래칫|복스|토크\s*렌치/i.test(words)) return 'socket';
  if (/\btorx\b|톡스|별\s*(?:비트|드라이버|렌치)/i.test(words)) return 'torx';
  if (/\b(?:phillips|pozidriv)\b|십자/i.test(words)) return 'phillips';
  if (/\b(?:slotted|flat[ -]blade|flat[ -]head screwdriver)\b|일자/i.test(words)) return 'slotted';
  if (/\b(?:allen|inbus|hex(?:agonal)?[ -]+(?:key|bit|drive|socket))\b|육각|헥스/i.test(words)) return 'hex-key';
}

export function getPracticeToolKind(tool: string, fastenerName: string): PracticeToolKind {
  return namedTool(tool) ?? namedTool(fastenerName) ?? 'driver';
}

export function getPracticeToolShape(kind: PracticeToolKind, head: StepPick, boltSize: number) {
  const radius = 'radius' in head && typeof head.radius === 'number' && head.radius > 0 ? head.radius : boltSize * 0.25;
  const recess = 'driveDepth' in head && typeof head.driveDepth === 'number' ? head.driveDepth : 0;
  const drive = radius * (kind === 'hex-key' ? 0.43 : 0.51);
  const depth = kind === 'socket' ? radius * 0.42 : Math.max(0, Math.min(recess * 0.8, drive * 1.4));
  const shaft = Math.max(radius * 2.8, boltSize * (kind === 'hex-key' ? 0.56 : 0.86));
  const longArm = kind === 'hex-key' || kind === 'socket';
  const grip = Math.max(radius * (longArm ? 4.8 : 5.6), boltSize * (longArm ? 1.44 : 1.15));
  const standoff = Math.max(radius * 1.5, boltSize * 0.21);
  const axial = kind === 'hex-key' ? shaft + drive : kind === 'socket' ? radius * 2.35 : shaft + grip;
  const radial = longArm ? grip + radius : radius * 1.5;
  return { radius, drive, depth, shaft, grip, standoff, axial, radial };
}

export type PracticeToolShape = ReturnType<typeof getPracticeToolShape>;

export function getPracticeToolView(model: StepBounds, head: StepPick, scale: number, boltSize: number, shape: PracticeToolShape, preferred: VectorTuple) {
  const axis = new Vector3(...head.normal).normalize();
  const tangent = new Vector3(...preferred);
  tangent.addScaledVector(axis, -tangent.dot(axis));
  if (tangent.lengthSq() < 0.001) {
    tangent.set(Math.abs(axis.x) > 0.8 ? 0 : 1, Math.abs(axis.x) > 0.8 ? -1 : 0, 0);
    tangent.addScaledVector(axis, -tangent.dot(axis));
  }
  const direction = tangent.normalize().addScaledVector(axis, 1.15).normalize().toArray() as VectorTuple;
  const origin = head.point.map((value, index) => value / scale + (model.min[index] + model.max[index]) / 2);
  const positive = shape.axial + shape.standoff;
  const radial = Math.max(shape.radial, boltSize * 0.7);
  const extents = axis.toArray().map((value) => {
    const width = Math.sqrt(Math.max(0, 1 - value * value)) * radial;
    const top = value * positive;
    const bottom = -value * boltSize * 0.64;
    return [(Math.min(top, bottom) - width) / scale, (Math.max(top, bottom) + width) / scale];
  });
  return { direction, bounds: {
    min: origin.map((value, index) => value + extents[index][0]) as VectorTuple,
    max: origin.map((value, index) => value + extents[index][1]) as VectorTuple,
  } };
}
