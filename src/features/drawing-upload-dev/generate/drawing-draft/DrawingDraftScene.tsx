'use client';
import { useEffect, useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Box3, MeshStandardMaterial, Vector3 } from 'three';
import { SceneCanvas } from '@/components/scene/SceneCanvas';
import { PreviewOutline } from '@/components/scene/PreviewOutline';
import { theme } from '@/styles/theme';
import { appearanceSurface, type ModelAppearance } from '@/features/part-library/modelAppearance';
import { AssemblyCamera } from '../../assembly/AssemblyCamera';
import type { DrawingShape, DraftSize } from './draftGeometry';
import { buildDrawingModel } from './buildDrawingModel';

function Model({ shape, size, appearance }: { shape: DrawingShape; size: DraftSize; appearance: ModelAppearance }) {
  const model = useMemo(() => {
    const material = new MeshStandardMaterial(appearanceSurface(appearance));
    return { ...buildDrawingModel(shape, size, material), material };
  }, [shape, size, appearance]);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
    return () => { model.dispose(); model.material.dispose(); };
  }, [model, invalidate]);
  return <primitive object={model.frame} dispose={null} />;
}

export default function DrawingDraftScene({ shape, size, appearance, command, view }: { shape: DrawingShape; size: DraftSize; appearance: ModelAppearance; command: number; view: 'oblique' | 'side' }) {
  const bounds = useMemo(() => new Box3(new Vector3(-size.width / 2, -size.height / 2, -size.depth / 2), new Vector3(size.width / 2, size.height / 2, size.depth / 2)), [size]);
  const sourceDirection = shape.kind === 'isometric' ? shape.cameraDirection : undefined;
  return <SceneCanvas key={sourceDirection ? 'ortho' : 'perspective'} orthographic={!!sourceDirection} frameloop="demand" resize={{ offsetSize: true }}
    camera={{ ...(sourceDirection ? {} : { fov: 36 }), position: [45, -30, 230], up: [0, 1, 0], near: .01, far: 20000 }}>
    <hemisphereLight args={['#eef4ff', '#4b4640', 1.15]} />
    <directionalLight position={[-45, 80, 60]} intensity={2.45} />
    <directionalLight position={[80, 25, -50]} intensity={1.1} />
    <directionalLight position={[-65, 20, -100]} intensity={1.05} color={theme.color.primarySoft} />
    <Model shape={shape} size={size} appearance={appearance} />
    <OrbitControls makeDefault />
    <AssemblyCamera bounds={bounds} command={command} viewKey={Object.values(size).join('|')} view={view} sourceDirection={sourceDirection} />
    <PreviewOutline color={appearance.color} />
  </SceneCanvas>;
}
