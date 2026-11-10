import { Quaternion, Vector3, type PerspectiveCamera } from 'three';
import type { StepBounds, VectorTuple } from '../../drawing-upload-dev/model/stepTypes';

const pickupBand = { bottom: 0.35, top: 0.88, halfWidth: 0.42 };

export function getPracticePartCorners(model: StepBounds, part: StepBounds, scale: number) {
  const center = model.min.map((value, axis) => (value + model.max[axis]) / 2);
  const min = part.min.map((value, axis) => (value - center[axis]) * scale);
  const max = part.max.map((value, axis) => (value - center[axis]) * scale);
  return [min[0], max[0]].flatMap((x) => [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z) => new Vector3(x, y, z))));
}

export function isPracticePartVisible(camera: PerspectiveCamera, corners: readonly Vector3[], offset: VectorTuple, projected: Vector3) {
  return corners.every((corner) => {
    projected.set(corner.x + offset[0], corner.y + offset[1], corner.z + offset[2]).project(camera);
    return Math.abs(projected.x) <= 0.96 && Math.abs(projected.y) <= 0.96 && projected.z >= -1 && projected.z <= 1;
  });
}

export function getPracticePickupPose(camera: PerspectiveCamera, corners: readonly Vector3[], destination: Vector3) {
  const center = corners[0].clone().lerp(corners[corners.length - 1], 0.5);
  const reference = destination.clone().applyMatrix4(camera.matrixWorldInverse);
  const assemblyDepth = reference.z < 0 ? -reference.z : reference.length();
  const depth = Math.max(camera.near * 6, Math.min(assemblyDepth * 0.22, camera.far * 0.25));
  // Leave room for the preparation list on narrow views.
  const aimX = camera.aspect < 1.25 ? -0.3 : 0;
  const { bottom, top, halfWidth } = pickupBand;
  const aimY = (bottom + top) / 2;
  const left = aimX - halfWidth, right = aimX + halfWidth;
  const matrix = camera.projectionMatrix.elements;
  const inverseRotation = camera.getWorldQuaternion(new Quaternion()).invert();
  const limit = (margin: number, rate: number) => rate > 0 ? margin / rate : Infinity;
  const relative = new Vector3();
  let scale = Infinity;

  for (const corner of corners) {
    relative.copy(corner).sub(center).applyQuaternion(inverseRotation);
    const x = relative.x * matrix[0], y = relative.y * matrix[5], z = relative.z;
    scale = Math.min(scale,
      limit((aimX - left) * depth, -x - (left + matrix[8]) * z),
      limit((right - aimX) * depth, x + (right + matrix[8]) * z),
      limit((aimY - bottom) * depth, -y - (bottom + matrix[9]) * z),
      limit((top - aimY) * depth, y + (top + matrix[9]) * z),
      limit(depth - camera.near * 1.1, z), limit(camera.far - depth, -z));
  }

  if (!Number.isFinite(scale)) scale = 1;
  const position = new Vector3((aimX + matrix[8]) * depth / matrix[0], (aimY + matrix[9]) * depth / matrix[5], -depth);
  const offset = position.applyMatrix4(camera.matrixWorld).addScaledVector(center, -scale).toArray() as VectorTuple;
  return { offset, scale };
}
