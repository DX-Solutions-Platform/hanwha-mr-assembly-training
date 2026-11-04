'use client';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { setHorizonY } from '@/lib/horizonStore';
import { theme } from '@/styles/theme';

const forwardVector = new THREE.Vector3();
const farPoint = new THREE.Vector3();

/** 카메라 시선에 맞춰 배경 수평선 높이를 갱신 → 시점을 움직여도 수평선과 바닥 눈금판이 이어져 보임 */
export function HorizonSync() {
  useFrame(({ camera }) => {
    camera.getWorldDirection(forwardVector);
    forwardVector.y = 0;
    if (forwardVector.lengthSq() < 1e-6) return;
    forwardVector.normalize();
    farPoint.copy(camera.position).addScaledVector(forwardVector, 4000);
    farPoint.y = 0;
    farPoint.project(camera);
    setHorizonY(((1 - farPoint.y) / 2) * theme.stage.height);
  });
  return null;
}
