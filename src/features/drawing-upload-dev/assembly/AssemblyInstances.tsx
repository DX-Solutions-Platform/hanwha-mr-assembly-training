import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Color, InstancedMesh, type Matrix4 } from 'three';
import { theme } from '@/styles/theme';
import { buildAssemblyGeometry } from './buildAssemblyGeometry';
import { assemblyPreviewMatrix } from './assemblyTransforms';
import type { AssemblyKind, AssemblyPart } from './assemblyTypes';

export function AssemblyInstances({ kind, partList, matrices, selectedId, isExploded, onSelect }: { kind: AssemblyKind; partList: AssemblyPart[]; matrices: Map<string, Matrix4>; selectedId: string; isExploded: boolean; onSelect: (id: string) => void }) {
  const meshRef = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => buildAssemblyGeometry(kind), [kind]);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const colors: Record<AssemblyKind, string> = { base: theme.color.inkDisabled, flange: theme.color.inkMuted, bolt: theme.color.inkSub, nut: theme.color.primarySoft, other: theme.color.ink };
    partList.forEach((part, index) => {
      mesh.setMatrixAt(index, assemblyPreviewMatrix(part, matrices.get(part.id)!, isExploded));
      mesh.setColorAt(index, new Color(part.id === selectedId ? theme.color.primary : colors[kind]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingBox(); mesh.computeBoundingSphere(); invalidate();
  }, [partList, matrices, selectedId, isExploded, kind, invalidate]);
  return <instancedMesh ref={meshRef} args={[geometry, undefined, partList.length]} onClick={(event) => {
    if (event.delta > 4 || event.instanceId == null) return;
    event.stopPropagation(); onSelect(partList[event.instanceId].id);
  }}>
    <meshStandardMaterial color={theme.color.ink} metalness={kind === 'base' || kind === 'flange' ? .25 : .5} roughness={.45} />
  </instancedMesh>;
}
