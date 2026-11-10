import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { modelScale } from './stepModel';
import { fitStepViewDistance } from './stepCameraFraming';
import type { StepBounds, StepModel, VectorTuple } from './stepTypes';

function updateClipping(camera: PerspectiveCamera | OrthographicCamera, distance: number) {
  camera.near = Math.max(distance / 1000, 0.000001);
  camera.far = Math.max(distance * 100, 100);
  camera.updateProjectionMatrix();
}
export function StepCamera({ model, command, focusBounds, viewNormal, viewDirection, viewTarget, fixedView }: {
  model: StepModel; command: number; focusBounds: StepBounds | null; viewNormal?: VectorTuple;
  viewDirection?: VectorTuple; viewTarget?: VectorTuple; fixedView?: boolean;
}) {
  const { camera, controls, invalidate, size } = useThree();
  const orbit = controls as unknown as { target: Vector3; update: () => void } | null;

  useLayoutEffect(() => {
    const bounds = focusBounds ?? model.bounds;
    const scale = modelScale(model.bounds);
    const center = model.bounds.min.map((value, axis) => value + (model.bounds.max[axis] - value) / 2);
    const normalized = (point: VectorTuple) => point.map((value, axis) => (value - center[axis]) * scale) as VectorTuple;
    const min = normalized(bounds.min), max = normalized(bounds.max);
    const target = viewTarget ? new Vector3(...viewTarget) : new Vector3(...min).lerp(new Vector3(...max), 0.5);
    const radius = Math.max(Math.hypot(...bounds.min.map((value, axis) => (bounds.max[axis] - value) * scale)) / 2, 0.0001);
    const aspect = Math.max(size.width, 1) / Math.max(size.height, 1);
    const fov = camera instanceof PerspectiveCamera ? camera.fov * Math.PI / 180 : Math.PI / 4;
    const vertical = Math.min(fov / 2, Math.atan(Math.tan(fov / 2) * aspect));
    let distance = radius / Math.sin(vertical) * 1.15;
    const direction = new Vector3(...(viewDirection ?? [1.3, -1.6, 1.2])).normalize();
    if (viewNormal) direction.addScaledVector(new Vector3(...viewNormal), 2).normalize();
    if (viewDirection) distance = fitStepViewDistance(min, max, target, direction, fov, aspect);
    const position = direction.multiplyScalar(distance).add(target);
    camera.up.set(0, 0, 1);
    updateClipping(camera, distance);
    camera.position.copy(position); camera.lookAt(target);
    orbit?.target.copy(target);
    if (!fixedView) orbit?.update();
    invalidate();
  }, [model, command, focusBounds, viewNormal, viewDirection, viewTarget, fixedView, camera, orbit, invalidate, size.width, size.height]);
  return null;
}
