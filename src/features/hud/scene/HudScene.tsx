'use client';
import { Suspense } from 'react';
import { SceneCanvas } from '@/components/scene/SceneCanvas';
import { HorizonSync } from '@/components/scene/HorizonSync';
import type { HudPhase } from '../state/hudReducer';
import { FreeCameraRig } from './FreeCameraRig';
import { InfiniteGrid } from './InfiniteGrid';
import { WorkpieceModel } from './WorkpieceModel';

interface HudSceneProps { phase: HudPhase; benchHeight: number; isLayoutEditing: boolean; onExplodeDone: () => void; onPlacingDone: () => void; }

/**
 * 교육장 3D (저사양 PC · Quest 3 기준)
 * - 렌더 배율·품질 자동 조절은 SceneCanvas가 담당
 * - 그림자 맵 1024 한 개, 후처리 없음
 * - 배경은 투명 → 평평해진 수평선(HorizonBackdrop)이 HorizonSync로 바닥 눈금판 끝에 맞춰짐
 */
export function HudScene({ phase, benchHeight, onExplodeDone, onPlacingDone }: HudSceneProps) {
  return (
    <SceneCanvas hasShadows camera={{ position: [0, 1.6, 2.4], fov: 42, near: 0.01, far: 80 }}>
      <hemisphereLight args={['#e6ecf0', '#1a1512', 0.75]} />
      <directionalLight position={[2, 4, 3]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 1.5, -2]} intensity={1.1} color="#f37321" />
      <InfiniteGrid />
      <Suspense fallback={null}>
        <group position={[0, benchHeight, 0]}>
          <WorkpieceModel phase={phase} onExplodeDone={onExplodeDone} onPlacingDone={onPlacingDone} />
        </group>
      </Suspense>
      <FreeCameraRig />
      <HorizonSync />
    </SceneCanvas>
  );
}
