'use client';
import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bounds, OrbitControls, useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { SceneCanvas } from '@/components/scene/SceneCanvas';
import { PreviewOutline } from '@/components/scene/PreviewOutline';
import type { ModelAppearance } from './modelAppearance';
import { applyModelAppearance } from './applyModelAppearance';

class ModelBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? <span role="alert">GLB를 표시할 수 없습니다.</span> : this.props.children; }
}

function Model({ url, onReady, appearance }: { url: string; onReady: (url: string) => void; appearance?: ModelAppearance }) {
  const { scene } = useGLTF(url, false);
  const preview = useMemo(() => {
    const object = scene.clone(true);
    const dispose = appearance ? applyModelAppearance(object, appearance, true) : undefined;
    return { object, dispose };
  }, [scene, appearance]);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => { onReady(url); }, [onReady, url]);
  useEffect(() => {
    invalidate();
    return preview.dispose;
  }, [preview, invalidate]);
  return <primitive object={preview.object} dispose={null} />;
}

export function LibraryModelPreview({ url, appearance, withinStage = false }: { url: string; appearance?: ModelAppearance; withinStage?: boolean }) {
  const [readyUrl, setReadyUrl] = useState('');
  return <ModelBoundary key={url}>{readyUrl !== url && <span role="status">3D 모델을 불러오는 중입니다.</span>}<SceneCanvas camera={{ position: [2.8, 2, 3.2], fov: 44 }} frameloop="demand" resize={withinStage ? { offsetSize: true } : undefined}>
    <ambientLight intensity={1.35} />
    <directionalLight position={[2, 4, 5]} intensity={2.6} />
    <directionalLight position={[-3, 1, -3]} intensity={1.3} />
    <OrbitControls makeDefault enablePan={false} />
    <Suspense fallback={null}><Bounds fit clip observe margin={withinStage ? 1.65 : 1.35} maxDuration={0.2}><Model url={url} onReady={setReadyUrl} appearance={appearance} /></Bounds></Suspense>
    <PreviewOutline color={appearance?.color} />
  </SceneCanvas>{readyUrl === url && <span hidden data-library-model-ready />}</ModelBoundary>;
}
