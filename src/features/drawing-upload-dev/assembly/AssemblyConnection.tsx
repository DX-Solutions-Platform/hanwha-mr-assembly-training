import { Line } from '@react-three/drei';
import { Vector3, type Matrix4 } from 'three';
import { theme } from '@/styles/theme';
import { getPartAnchors } from './assemblyTemplate';
import { assemblyPreviewMatrix } from './assemblyTransforms';
import type { AssemblyDocument } from './assemblyTypes';

export function AssemblyConnection({ document, matrices, selectedId, isExploded }: { document: AssemblyDocument; matrices: Map<string, Matrix4>; selectedId: string; isExploded: boolean }) {
  const selected = document.partList.find((part) => part.id === selectedId)!;
  const parent = document.partList.find((part) => part.id === selected.relation.parentId);
  if (!parent) return null;
  const target = getPartAnchors(parent).find((anchor) => anchor.id === selected.relation.targetAnchorId)!;
  const own = getPartAnchors(selected).find((anchor) => anchor.id === selected.relation.ownAnchorId)!;
  const a = new Vector3(...target.position).applyMatrix4(assemblyPreviewMatrix(parent, matrices.get(parent.id)!, isExploded));
  const b = new Vector3(...own.position).applyMatrix4(assemblyPreviewMatrix(selected, matrices.get(selected.id)!, isExploded));
  return <group>
    <mesh position={a}><sphereGeometry args={[1.8, 12, 8]} /><meshBasicMaterial color={theme.color.primary} depthTest={false} /></mesh>
    <mesh position={b}><sphereGeometry args={[1.2, 12, 8]} /><meshBasicMaterial color={theme.color.success} depthTest={false} /></mesh>
    {a.distanceTo(b) > .05 && <Line points={[a, b]} color={theme.color.success} lineWidth={1} dashed dashSize={2} gapSize={2} />}
  </group>;
}
