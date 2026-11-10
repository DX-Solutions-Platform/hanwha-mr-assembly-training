'use client';
import { Html, OrbitControls } from '@react-three/drei';
import { SceneCanvas } from '@/components/scene/SceneCanvas';
import { theme } from '@/styles/theme';
import { StepGeometry } from './StepGeometry';
import { StepCamera } from './StepCamera';
import type { StepBounds, StepModel, StepPick, VectorTuple } from './stepTypes';

type PositionMarker = { point: VectorTuple; label: string };

export default function StepScene({ model, selectedShapeIds, isIsolated, command, focusBounds, onSelect, showThrough, referenceShapeIds, marker, referenceMarker, wireframe, viewNormal }: {
  model: StepModel; selectedShapeIds: readonly string[]; isIsolated: boolean; command: number; focusBounds: StepBounds | null;
  onSelect: (id: string | null, pick?: StepPick) => void; showThrough?: boolean; referenceShapeIds?: readonly string[];
  marker?: PositionMarker; referenceMarker?: PositionMarker; wireframe?: boolean; viewNormal?: VectorTuple;
}) {
  return <SceneCanvas frameloop="demand" camera={{ fov: 35, position: [4, -5, 3], up: [0, 0, 1], near: 0.001, far: 1000 }} onPointerMissed={() => onSelect(null)}>
    <ambientLight intensity={1.1} color={theme.color.ink} />
    <directionalLight position={[3, -4, 6]} intensity={2.5} color={theme.color.ink} />
    <directionalLight position={[-4, 3, 2]} intensity={1.2} color={theme.color.primarySoft} />
    <StepGeometry model={model} selectedShapeIds={selectedShapeIds} isIsolated={isIsolated} onSelect={onSelect}
      showThrough={showThrough} referenceShapeIds={referenceShapeIds} wireframe={wireframe} />
    {marker && <PositionArrow {...marker} />}
    {referenceMarker && <PositionArrow {...referenceMarker} reference />}
    <OrbitControls makeDefault enableDamping />
    <StepCamera model={model} command={command} focusBounds={focusBounds} viewNormal={viewNormal} />
  </SceneCanvas>;
}

function PositionArrow({ point, label, reference }: PositionMarker & { reference?: boolean }) {
  const color = reference ? '#7ec9ff' : '#ffbd70';
  return <Html position={point} style={{ pointerEvents: 'none', color }}>
    <svg width="1" height="1" overflow="visible" style={{ position: 'absolute', top: 0, left: 0 }} aria-hidden="true">
      <g transform={reference ? 'scale(-1 1)' : undefined}>
        <path d="M -64 -48 L -46 -48 L -5 -5" fill="none" stroke="#111519" strokeWidth="5" />
        <path d="M -64 -48 L -46 -48 L -5 -5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M 0 0 L -13 -4 L -4 -13 Z" fill="currentColor" stroke="#111519" strokeWidth="1.4" />
      </g>
    </svg>
    <span style={{ position: 'absolute', top: -71, left: reference ? 64 : -64, transform: 'translateX(-50%)',
      padding: '4px 8px', border: '1px solid currentColor', borderRadius: 4, background: '#12171d', whiteSpace: 'nowrap',
      fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{label}</span>
  </Html>;
}
