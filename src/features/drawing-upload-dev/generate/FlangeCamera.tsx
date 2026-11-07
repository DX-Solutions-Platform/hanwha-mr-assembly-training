import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import type { FlangeParameters } from './flangeTypes';

function clip(camera: PerspectiveCamera | OrthographicCamera, radius: number) {
  camera.near = Math.max(radius / 1000, .001); camera.far = Math.max(radius * 100, 1000); camera.updateProjectionMatrix();
}
export function FlangeCamera({ parameters, command }: { parameters: FlangeParameters; command: number }) {
  const { camera, controls, size, invalidate } = useThree();
  useEffect(() => {
    const radius = Math.hypot(parameters.outerDiameter, parameters.thickness) / 2;
    const fov = camera instanceof PerspectiveCamera ? camera.fov * Math.PI / 180 : Math.PI / 4;
    const halfAngle = Math.min(fov / 2, Math.atan(Math.tan(fov / 2) * size.width / Math.max(size.height, 1)));
    const distance = radius / Math.sin(halfAngle) * 1.15;
    camera.up.set(0, 0, 1); camera.position.copy(new Vector3(1.2, -1.5, 1.8).normalize().multiplyScalar(distance));
    camera.lookAt(0, 0, 0); clip(camera, radius);
    const orbit = controls as unknown as { target: Vector3; update: () => void } | null;
    orbit?.target.set(0, 0, 0); orbit?.update(); invalidate();
  }, [parameters, command, camera, controls, size.width, size.height, invalidate]);
  return null;
}
