import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Box3, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';

function clipping(camera: PerspectiveCamera | OrthographicCamera, distance: number) {
  camera.near = Math.max(distance / 10000, .001); camera.far = Math.max(distance * 100, 20000); camera.updateProjectionMatrix();
}
function fitOrthographicZoom(camera: OrthographicCamera, radius: number) {
  camera.zoom = Math.min(camera.right - camera.left, camera.top - camera.bottom) / (radius * 2.24);
}
type View = 'assembly' | 'oblique' | 'side';

export function AssemblyCamera({ bounds, command, viewKey, view = 'assembly', sourceDirection }: {
  bounds: Box3; command: number; viewKey: string; view?: View; sourceDirection?: [number, number, number];
}) {
  const { camera, controls, size, invalidate } = useThree();
  const lastFit = useRef<{ key: string; controls: unknown } | null>(null);
  useEffect(() => {
    const key = [command, viewKey, view, sourceDirection?.join(','), size.width, size.height].join('|');
    if (lastFit.current?.key === key && lastFit.current.controls === controls) return;
    lastFit.current = { key, controls };
    const center = bounds.getCenter(new Vector3()), radius = Math.max(bounds.getSize(new Vector3()).length() / 2, 1);
    const fov = camera instanceof PerspectiveCamera ? camera.fov * Math.PI / 180 : Math.PI / 4;
    const half = Math.min(fov / 2, Math.atan(Math.tan(fov / 2) * size.width / Math.max(size.height, 1)));
    const distance = radius / Math.sin(half) * 1.12;
    const direction = view === 'assembly' ? new Vector3(1.3, -1.6, 1.35) : view === 'side' ? new Vector3(-1, .08, 0)
      : sourceDirection ? new Vector3(...sourceDirection) : new Vector3(-1.1, .58, 1.55);
    if (camera instanceof OrthographicCamera) fitOrthographicZoom(camera, radius);
    camera.up.set(0, view === 'assembly' ? 0 : 1, view === 'assembly' ? 1 : 0);
    camera.position.copy(direction.normalize().multiplyScalar(distance).add(center));
    camera.lookAt(center); clipping(camera, distance);
    const orbit = controls as unknown as { target: Vector3; update: () => void } | null;
    orbit?.target.copy(center); orbit?.update(); invalidate();
  }, [bounds, command, viewKey, camera, controls, size.width, size.height, invalidate, view, sourceDirection]);
  return null;
}
