'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FloatingRingProps { stationIndex: number; progress: number; isHovered: boolean; isVisible: boolean; }

const RING_RADIUS = 0.62;

/** 부유링 (확정 H): 공중에 뜬 얇은 빛 링 + 진행률 호. 처음엔 바닥에서 떠오름 */
export function FloatingRing({ stationIndex, progress, isHovered, isVisible }: FloatingRingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const visibilityRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const materialList = useMemo(() => [
    new THREE.MeshBasicMaterial({ color: 0xf37321, transparent: true, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: 0xffd9bd, transparent: true, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: 0xf37321, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  ], []);
  const progressGeometry = useMemo(() => new THREE.TorusGeometry(RING_RADIUS + 0.06, 0.01, 6, 64, Math.max(0.001, progress) * Math.PI * 2), [progress]);

  useFrame(({ clock }, deltaTime) => {
    const group = groupRef.current; if (!group) return;
    const elapsed = clock.elapsedTime;
    startTimeRef.current ??= elapsed;
    const introProgress = THREE.MathUtils.clamp((elapsed - startTimeRef.current - stationIndex * 0.12) / 1.2, 0, 1);
    const introEase = 1 - Math.pow(1 - introProgress, 3);
    visibilityRef.current = THREE.MathUtils.damp(visibilityRef.current, isVisible ? 1 : 0, 5, deltaTime);
    const visibility = visibilityRef.current * introEase;
    group.visible = visibility > 0.01;
    group.position.y = -0.55 * (1 - introEase) - 0.4 * (1 - visibilityRef.current) + Math.sin(elapsed * 1.3 + stationIndex) * 0.012;
    group.rotation.z += deltaTime * 0.12;
    const glow = isHovered ? 1 : 0.6;
    // Animate the mounted Three objects through their scene ref.
    const meshes = group.children as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
    meshes[0].material.opacity = 0.9 * glow * visibility;
    meshes[1].material.opacity = 0.35 * visibility;
    meshes[2].material.opacity = 0.08 * glow * visibility;
  });

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh material={materialList[0]}><torusGeometry args={[RING_RADIUS, 0.006, 6, 96]} /></mesh>
      <mesh material={materialList[1]} geometry={progressGeometry} />
      <mesh material={materialList[2]}><ringGeometry args={[RING_RADIUS * 0.35, RING_RADIUS, 64]} /></mesh>
    </group>
  );
}
