'use client';
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { applyOrbit, useOrbitDrag } from '@/components/scene/useOrbitDrag';
import type { BuiltModel } from '@/lib/three/buildModel';

interface ComplexCameraProps { builtModel: BuiltModel; viewDistance: number; selectedSectionIndex: number | null; }

/** 전체 보기 ↔ 선택한 공정으로 다가가기 (드래그 회전·이동, Ctrl+휠 확대) */
export function ComplexCamera({ builtModel, viewDistance, selectedSectionIndex }: ComplexCameraProps) {
  const { camera } = useThree();
  const orbitRef = useOrbitDrag(true);
  const lookRef = useRef(new THREE.Vector3(0, 0.8, 0));
  const target = useMemo(() => ({ position: new THREE.Vector3(), look: new THREE.Vector3(), center: new THREE.Vector3() }), []);
  const baseOffset = useMemo(() => new THREE.Vector3(0.9, 0.75, 2.4).multiplyScalar(viewDistance), [viewDistance]);
  const sectionOffset = useMemo(() => new THREE.Vector3(0.6, 0.45, 1.3).multiplyScalar(viewDistance * 0.6), [viewDistance]);

  useFrame((_, deltaTime) => {
    const isSection = selectedSectionIndex !== null;
    if (isSection) {
      const part = builtModel.partList.find((item) => item.sectionIndex === selectedSectionIndex);
      target.center.copy(builtModel.sectionCenterList[selectedSectionIndex]);
      if (part) target.center.addScaledVector(part.sectionOffset, 1.35);
    } else target.center.set(0, builtModel.size.y * 0.45, 0);
    applyOrbit(target.center, isSection ? sectionOffset : baseOffset, orbitRef.current, target.position, target.look);
    const smoothing = 1 - Math.exp(-deltaTime * 4);
    camera.position.lerp(target.position, smoothing);
    lookRef.current.lerp(target.look, smoothing);
    camera.lookAt(lookRef.current);
  });
  return null;
}
