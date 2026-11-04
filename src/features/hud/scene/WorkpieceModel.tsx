'use client';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { HudPhase } from '../state/hudReducer';

/**
 * 조립 대상 모델. 실제 구현: 도면 분석 결과의 부품 GLB를 로드해 단계별로 배치.
 * explode: 부품이 바깥으로 펼쳐짐 · placing: 재료 구역으로 이동
 */
export function WorkpieceModel({ phase, onExplodeDone, onPlacingDone }: { phase: HudPhase; onExplodeDone: () => void; onPlacingDone: () => void }) {
  const groupRef = useRef<Group>(null);
  const progressRef = useRef(0);
  const hasNotifiedRef = useRef(false);

  useEffect(() => { progressRef.current = 0; hasNotifiedRef.current = false; }, [phase]);

  useFrame((_, deltaTime) => {
    const group = groupRef.current; if (!group) return;
    if (phase === 'preview') group.rotation.y += deltaTime * 0.3;
    if (phase === 'explode' || phase === 'placing') {
      progressRef.current = Math.min(1, progressRef.current + deltaTime / 1.4);
      const eased = 1 - Math.pow(1 - progressRef.current, 3);
      group.children.forEach((child, childIndex) => { child.position.y = 0.15 + childIndex * (0.12 + eased * (phase === 'explode' ? 0.18 : 0)); });
      if (progressRef.current >= 1 && !hasNotifiedRef.current) { hasNotifiedRef.current = true; (phase === 'explode' ? onExplodeDone : onPlacingDone)(); }
    }
  });

  return (
    <group ref={groupRef}>
      {[0, 1, 2].map((partIndex) => (
        <mesh key={partIndex} position={[0, 0.15 + partIndex * 0.12, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.16 - partIndex * 0.02, 0.16 - partIndex * 0.02, 0.1, 32]} />
          <meshStandardMaterial color={['#5d6670', '#8b939b', '#c9d1d8'][partIndex]} metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}
