import { Vector3 } from 'three';
import type { VectorTuple } from './stepTypes';

export function fitStepViewDistance(min: VectorTuple, max: VectorTuple, target: Vector3, direction: Vector3, fov: number, aspect: number) {
  const right = new Vector3(0, 0, 1).cross(direction).normalize();
  const up = direction.clone().cross(right);
  const tangent = Math.tan(fov / 2);
  let fit = 0.001;
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
    const corner = new Vector3(x, y, z).sub(target);
    const horizontal = Math.abs(corner.dot(right)) / (tangent * aspect);
    const vertical = Math.abs(corner.dot(up)) / tangent;
    fit = Math.max(fit, corner.dot(direction) + Math.max(horizontal, vertical));
  }
  return fit * 1.1;
}
