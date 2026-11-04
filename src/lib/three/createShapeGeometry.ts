import * as THREE from 'three';
import type { ShapeKind } from '@/types/model';

const geometryCache = new Map<string, THREE.BufferGeometry>();

/** 같은 모양·크기 지오메트리는 공유 */
export function createShapeGeometry(shape: ShapeKind, size: number[]): THREE.BufferGeometry {
  const cacheKey = `${shape}:${size.join(',')}`;
  const cached = geometryCache.get(cacheKey);
  if (cached) return cached;
  const [a = 0.1, b = 0.1, c = 0.1] = size;
  const geometry = (() => {
    switch (shape) {
      case 'box': return new THREE.BoxGeometry(a, b, c);
      case 'cylinder': return new THREE.CylinderGeometry(a, b, c, 28);
      case 'cone': return new THREE.ConeGeometry(a, b, 28);
      case 'sphere': return new THREE.SphereGeometry(a, 24, 16);
      case 'torus': return new THREE.TorusGeometry(a, b, 10, 40);
      case 'capsule': return new THREE.CapsuleGeometry(a, b, 6, 16);
    }
  })();
  geometryCache.set(cacheKey, geometry);
  return geometry;
}
