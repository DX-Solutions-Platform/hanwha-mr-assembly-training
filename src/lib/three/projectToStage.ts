import type * as THREE from 'three';
import type { ScreenPoint } from '@/types/scene';
import { theme } from '@/styles/theme';

/** 월드 좌표 → 1920×1080 화면 좌표 (캔버스가 16:9 프레임과 같은 크기라는 전제) */
export function projectToStage(worldPoint: THREE.Vector3, camera: THREE.Camera, target: ScreenPoint, isVisible = true) {
  const projected = worldPoint.clone().project(camera);
  target.x = ((projected.x + 1) / 2) * theme.stage.width;
  target.y = ((1 - projected.y) / 2) * theme.stage.height;
  target.isVisible = isVisible && projected.z < 1;
}
