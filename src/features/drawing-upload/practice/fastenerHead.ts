import { Ray, Vector3 } from 'three';
import type { StepAssemblyPart } from '../../drawing-upload-dev/model/stepAssemblyParts';
import { modelScale } from '../../drawing-upload-dev/model/stepModel';
import type { StepModel, StepPick } from '../../drawing-upload-dev/model/stepTypes';

interface FastenerEnd extends StepPick {
  radius: number;
  depth: number;
  driveDepth: number;
}

/** Find the shaft axis from planar faces and identify the wider end when the head is distinguishable. */
export function getFastenerEnds(model: StepModel, part: StepAssemblyPart): FastenerEnd[] {
  const ids = new Set(part.shapeIds);
  const scale = modelScale(model.bounds);
  const center = new Vector3(...model.bounds.min).lerp(new Vector3(...model.bounds.max), 0.5);
  const partSize = new Vector3(...part.bounds.max).sub(new Vector3(...part.bounds.min)).length() * scale;
  const planePrecision = Math.max(partSize * 0.0001, 0.0000001);
  const faces = new Map<string, { area: number; normal: Vector3 }>();
  const weightedCenter = new Vector3();
  let totalArea = 0;
  const meshes: { positions: Float32Array; indices: Uint32Array }[] = [];
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  const normal = new Vector3(), edge = new Vector3(), midpoint = new Vector3();

  for (const shape of model.manifest.shapeList) {
    if (!ids.has(shape.id)) continue;
    const body = model.meshList[shape.meshIndex];
    const origin = new Vector3(...body.origin).sub(center).multiplyScalar(scale);
    const positions = body.position.map((value, index) => value * scale + origin.getComponent(index % 3));
    meshes.push({ positions, indices: body.index });
    for (let index = 0; index < body.index.length; index += 3) {
      a.fromArray(positions, body.index[index] * 3);
      b.fromArray(positions, body.index[index + 1] * 3);
      c.fromArray(positions, body.index[index + 2] * 3);
      normal.subVectors(b, a).cross(edge.subVectors(c, a));
      const area = normal.length();
      if (area === 0) continue;
      midpoint.copy(a).add(b).add(c).divideScalar(3);
      weightedCenter.addScaledVector(midpoint, area);
      totalArea += area;
      normal.divideScalar(area);
      const dominant = [0, 1, 2].reduce((axis, other) => Math.abs(normal.getComponent(other)) > Math.abs(normal.getComponent(axis)) ? other : axis);
      if (normal.getComponent(dominant) < 0) normal.negate();
      const orientation = normal.toArray().map((value) => Math.round(value * 1000)).join(',');
      const plane = Math.round(normal.dot(midpoint) / planePrecision);
      const key = `${orientation}:${plane}`;
      const face = faces.get(key);
      if (face) face.area += area;
      else faces.set(key, { area, normal: normal.clone() });
    }
  }

  let largest: { area: number; normal: Vector3 } | undefined;
  for (const face of faces.values()) if (!largest || face.area > largest.area) largest = face;
  if (!largest || totalArea <= 0) return [];

  const axis = largest.normal;
  const shaftCenter = weightedCenter.divideScalar(totalArea);
  let min = Infinity, max = -Infinity;
  for (const { positions } of meshes) {
    for (let index = 0; index < positions.length; index += 3) {
      const axial = a.fromArray(positions, index).sub(shaftCenter).dot(axis);
      min = Math.min(min, axial);
      max = Math.max(max, axial);
    }
  }
  const length = max - min;
  if (length <= 0) return [];
  const endBand = length * 0.22;
  let minRadius = 0, maxRadius = 0;
  for (const { positions } of meshes) {
    for (let index = 0; index < positions.length; index += 3) {
      const offset = a.fromArray(positions, index).sub(shaftCenter);
      const axial = offset.dot(axis);
      const radius = offset.addScaledVector(axis, -axial).length();
      if (axial <= min + endBand) minRadius = Math.max(minRadius, radius);
      if (axial >= max - endBand) maxRadius = Math.max(maxRadius, radius);
    }
  }
  const makeEnd = (axial: number, radius: number, direction: number): FastenerEnd => {
    const point = shaftCenter.clone().addScaledVector(axis, axial);
    const outward = axis.clone().multiplyScalar(direction);
    const ray = new Ray(point.clone().addScaledVector(outward, planePrecision), outward.clone().negate());
    let driveDepth = Infinity;
    for (const { positions, indices } of meshes) {
      for (let index = 0; index < indices.length; index += 3) {
        a.fromArray(positions, indices[index] * 3);
        b.fromArray(positions, indices[index + 1] * 3);
        c.fromArray(positions, indices[index + 2] * 3);
        const hit = ray.intersectTriangle(a, b, c, false, midpoint);
        if (hit) driveDepth = Math.min(driveDepth, ray.origin.distanceTo(hit) - planePrecision);
      }
    }
    return { point: point.toArray(), normal: outward.toArray(), radius,
      depth: Math.min(length * 0.28, Math.max(radius * 0.75, length * 0.1)),
      driveDepth: driveDepth < length * 0.65 ? Math.max(0, driveDepth) : 0 };
  };
  if (minRadius > maxRadius * 1.15) return [makeEnd(min, minRadius, -1)];
  if (maxRadius > minRadius * 1.15) return [makeEnd(max, maxRadius, 1)];
  const start = makeEnd(min, minRadius, -1), end = makeEnd(max, maxRadius, 1);
  if (start.driveDepth > end.driveDepth + length * 0.08) return [start];
  if (end.driveDepth > start.driveDepth + length * 0.08) return [end];
  return [start, end];
}

export function matchFastenerHead(ends: readonly FastenerEnd[], pick: StepPick) {
  const point = new Vector3(...pick.point);
  return ends.find((end) => {
    const axis = new Vector3(...end.normal);
    const offset = point.clone().sub(new Vector3(...end.point));
    const depth = offset.dot(axis);
    const radius = offset.addScaledVector(axis, -depth).length();
    const facesTool = new Vector3(...pick.normal).dot(axis) >= 0.25;
    const headFace = Math.abs(depth) <= end.depth && radius <= end.radius * (facesTool ? 0.6 : 0.42);
    const recessedDrive = facesTool && end.driveDepth > end.depth && depth < 0 && -depth <= end.driveDepth + end.radius * 0.08 && radius <= end.radius * 0.3;
    return headFace || recessedDrive;
  });
}

export function getFastenerHead(model: StepModel, part: StepAssemblyPart, pick: StepPick): StepPick {
  const ends = getFastenerEnds(model, part);
  if (ends.length < 2) return ends[0] ?? pick;
  const point = new Vector3(...pick.point);
  return point.distanceToSquared(new Vector3(...ends[0].point)) <= point.distanceToSquared(new Vector3(...ends[1].point)) ? ends[0] : ends[1];
}
