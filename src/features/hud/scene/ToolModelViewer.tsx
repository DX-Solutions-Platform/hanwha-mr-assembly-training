'use client';
import { Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, useGLTF } from '@react-three/drei';
import { useRef } from 'react';
import type { Group } from 'three';

/** 도구 3D (V 패널·거치대 공용). 세워서 자동 회전 */
function SpinningModel({ modelUrl }: { modelUrl: string }) {
  const { scene } = useGLTF(modelUrl);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<Group>(null);
  useFrame((_, deltaTime) => { if (groupRef.current) groupRef.current.rotation.y += deltaTime * 0.6; });
  return <group ref={groupRef}><Center>{<primitive object={clonedScene} />}</Center></group>;
}

export function ToolModelViewer({ modelUrl, size }: { modelUrl: string; size: number }) {
  return (
    <div style={{ width: size, height: size, filter: 'drop-shadow(0 0 2px rgba(255,190,140,.85)) drop-shadow(0 0 10px rgba(243,115,33,.45))' }}>
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 2.2], fov: 30 }} gl={{ alpha: true }} frameloop="always">
        <hemisphereLight args={['#e6ecf0', '#1a1512', 0.9]} />
        <directionalLight position={[1, 2, 2]} intensity={1.9} />
        <directionalLight position={[-2, 0.5, -1]} intensity={1.6} color="#f37321" />
        <Suspense fallback={null}><SpinningModel modelUrl={modelUrl} /></Suspense>
      </Canvas>
    </div>
  );
}
