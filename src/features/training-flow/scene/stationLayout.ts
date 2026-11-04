import * as THREE from 'three';
import { SHELF_ANGLE_STEP, SHELF_RADIUS } from '../state/flowTiming';

/** 제품들을 넓은 호(arc) 위에 배치 — 하나의 공간에 함께 놓인 느낌 */
export function getStationPosition(stationIndex: number, stationCount: number): THREE.Vector3 {
  const angle = (stationIndex - (stationCount - 1) / 2) * SHELF_ANGLE_STEP;
  return new THREE.Vector3(Math.sin(angle) * SHELF_RADIUS, 0, 3 - Math.cos(angle) * SHELF_RADIUS);
}
