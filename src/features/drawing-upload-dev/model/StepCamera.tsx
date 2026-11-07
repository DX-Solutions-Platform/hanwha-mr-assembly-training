import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { modelScale } from './stepModel';
import type { StepModel } from './stepTypes';

function updateClipping(camera: PerspectiveCamera | OrthographicCamera, distance: number) {
  camera.near = Math.max(distance / 1000, 0.000001);
  camera.far = Math.max(distance * 100, 100);
  camera.updateProjectionMatrix();
}
export function StepCamera({ model, command, focusId }: { model: StepModel; command: number; focusId: string | null }) {
  const { camera, controls, invalidate, size } = useThree();
  useEffect(() => {
    const orbit = controls as unknown as { target: Vector3; update: () => void } | null;
    const bounds = model.manifest.shapeList.find((shape) => shape.id === focusId)?.bounds ?? model.bounds;
    const scale = modelScale(model.bounds);
    const center = model.bounds.min.map((value, axis) => value + (model.bounds.max[axis] - value) / 2);
    const target = new Vector3(...bounds.min.map((value, axis) => (value + (bounds.max[axis] - value) / 2 - center[axis]) * scale) as [number, number, number]);
    const radius = Math.max(Math.hypot(...bounds.min.map((value, axis) => (bounds.max[axis] - value) * scale)) / 2, 0.0001);
    const aspect = size.width / Math.max(size.height, 1);
    const fov = camera instanceof PerspectiveCamera ? camera.fov * Math.PI / 180 : Math.PI / 4;
    const vertical = Math.min(fov / 2, Math.atan(Math.tan(fov / 2) * aspect));
    const distance = radius / Math.sin(vertical) * 1.15;
    camera.up.set(0, 0, 1); camera.position.copy(new Vector3(1.3, -1.6, 1.2).normalize().multiplyScalar(distance).add(target));
    updateClipping(camera, distance);
    camera.lookAt(target);
    orbit?.target.copy(target); orbit?.update(); invalidate();
  }, [model, command, focusId, camera, controls, invalidate, size.width, size.height]);
  return null;
}
