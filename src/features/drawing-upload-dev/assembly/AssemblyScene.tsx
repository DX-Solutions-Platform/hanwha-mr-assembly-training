'use client';
import { useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import type { Matrix4 } from 'three';
import { SceneCanvas } from '@/components/scene/SceneCanvas';
import { theme } from '@/styles/theme';
import { AssemblyInstances } from './AssemblyInstances';
import { AssemblyCamera } from './AssemblyCamera';
import { AssemblyConnection } from './AssemblyConnection';
import { assemblyBounds } from './assemblyTransforms';
import type { AssemblyDocument, AssemblyKind } from './assemblyTypes';
import { LibraryAssemblyInstance } from './LibraryAssemblyInstance';
import type { LibraryAssemblyModel } from './loadLibraryAssemblyModel';

export default function AssemblyScene({ document, matrices, selectedId, isExploded, isIsolated, showConnections, command, onSelect, models }: { document: AssemblyDocument; matrices: Map<string, Matrix4>; selectedId: string; isExploded: boolean; isIsolated: boolean; showConnections: boolean; command: number; onSelect: (id: string) => void; models?: Map<string, LibraryAssemblyModel> }) {
  const visible = document.partList.filter((part) => !isIsolated || part.id === selectedId);
  const bounds = useMemo(() => assemblyBounds(document, matrices, isExploded, isIsolated ? selectedId : null), [document, matrices, isExploded, isIsolated, selectedId]);
  return <SceneCanvas frameloop="demand" camera={{ fov: 35, position: [200, -250, 200], up: [0, 0, 1], near: .01, far: 20000 }}>
    <ambientLight intensity={1.2} color={theme.color.ink} />
    <directionalLight position={[150, -180, 250]} intensity={2.5} color={theme.color.ink} />
    <directionalLight position={[-120, 100, 100]} intensity={1.2} color={theme.color.primarySoft} />
    {models ? visible.map((part) => <LibraryAssemblyInstance key={part.id} part={part} model={models.get(part.model!.key)!} matrix={matrices.get(part.id)!} isSelected={part.id === selectedId} isExploded={isExploded} onSelect={onSelect} />) : (['base', 'flange', 'bolt', 'nut'] as AssemblyKind[]).map((kind) => {
      const parts = visible.filter((part) => part.kind === kind);
      return parts.length ? <AssemblyInstances key={kind} kind={kind} partList={parts} matrices={matrices} selectedId={selectedId} isExploded={isExploded} onSelect={onSelect} /> : null;
    })}
    {!models && !isIsolated && <gridHelper args={[240, 12, theme.color.inkDisabled, theme.color.bgCenter]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -64]} />}
    {showConnections && <AssemblyConnection document={document} matrices={matrices} selectedId={selectedId} isExploded={isExploded} />}
    <OrbitControls makeDefault enableDamping />
    <AssemblyCamera bounds={bounds} command={command} viewKey={String(isExploded) + '|' + (isIsolated ? selectedId : 'all')} />
  </SceneCanvas>;
}
