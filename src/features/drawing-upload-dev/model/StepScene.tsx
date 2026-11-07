'use client';
import { OrbitControls } from '@react-three/drei';
import { SceneCanvas } from '@/components/scene/SceneCanvas';
import { theme } from '@/styles/theme';
import { StepGeometry } from './StepGeometry';
import { StepCamera } from './StepCamera';
import type { StepBounds, StepModel, StepPick, VectorTuple } from './stepTypes';

export default function StepScene({ model, selectedShapeIds, isIsolated, command, focusBounds, onSelect, showThrough, referenceShapeIds, marker }: {
  model: StepModel; selectedShapeIds: readonly string[]; isIsolated: boolean; command: number; focusBounds: StepBounds | null;
  onSelect: (id: string | null, pick?: StepPick) => void; showThrough?: boolean; referenceShapeIds?: readonly string[];
  marker?: VectorTuple;
}) {
  return <SceneCanvas frameloop="demand" camera={{ fov: 35, position: [4, -5, 3], up: [0, 0, 1], near: 0.001, far: 1000 }} onPointerMissed={() => onSelect(null)}>
    <ambientLight intensity={1.1} color={theme.color.ink} />
    <directionalLight position={[3, -4, 6]} intensity={2.5} color={theme.color.ink} />
    <directionalLight position={[-4, 3, 2]} intensity={1.2} color={theme.color.primarySoft} />
    <StepGeometry model={model} selectedShapeIds={selectedShapeIds} isIsolated={isIsolated} onSelect={onSelect}
      showThrough={showThrough} referenceShapeIds={referenceShapeIds} />
    {marker && <mesh position={marker} renderOrder={3} raycast={() => {}}>
      <sphereGeometry args={[0.018, 16, 10]} /><meshBasicMaterial color="#ffbd70" depthTest={false} depthWrite={false} />
    </mesh>}
    <OrbitControls makeDefault enableDamping />
    <StepCamera model={model} command={command} focusBounds={focusBounds} />
  </SceneCanvas>;
}
