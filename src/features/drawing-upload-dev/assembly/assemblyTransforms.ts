import { Box3, Euler, Matrix4, MathUtils, Quaternion, Vector3 } from 'three';
import { getPartAnchors } from './assemblyTemplate';
import type { AssemblyDocument, AssemblyKind, AssemblyPart, Triple } from './assemblyTypes';

export function resolveAssembly(document: AssemblyDocument) {
  const matrices = new Map<string, Matrix4>(), visiting = new Set<string>();
  const visit = (part: AssemblyPart): Matrix4 => {
    if (matrices.has(part.id)) return matrices.get(part.id)!;
    if (visiting.has(part.id)) throw new Error('순환 결합은 계산할 수 없습니다.');
    visiting.add(part.id);
    const rotation = new Matrix4().makeRotationFromEuler(new Euler(...part.rotation.map(MathUtils.degToRad) as Triple, 'XYZ'));
    let matrix = new Matrix4().makeTranslation(...part.position).multiply(rotation);
    if (part.relation.parentId) {
      const parent = document.partList.find((entry) => entry.id === part.relation.parentId);
      if (!parent) throw new Error('기준 부품이 없습니다.');
      const target = getPartAnchors(parent).find((anchor) => anchor.id === part.relation.targetAnchorId);
      const own = getPartAnchors(part).find((anchor) => anchor.id === part.relation.ownAnchorId);
      if (!target || !own) throw new Error('결합점이 없습니다.');
      matrix = visit(parent).clone().multiply(new Matrix4().makeTranslation(...target.position)).multiply(matrix).multiply(new Matrix4().makeTranslation(-own.position[0], -own.position[1], -own.position[2]));
    }
    visiting.delete(part.id); matrices.set(part.id, matrix); return matrix;
  };
  document.partList.forEach(visit); return matrices;
}
export function freeAssemblyPart(part: AssemblyPart, matrix: Matrix4): AssemblyPart {
  const position = new Vector3(), quaternion = new Quaternion(), scale = new Vector3();
  matrix.decompose(position, quaternion, scale);
  const euler = new Euler().setFromQuaternion(quaternion, 'XYZ');
  return { ...part, position: position.toArray(), rotation: [euler.x, euler.y, euler.z].map(MathUtils.radToDeg) as Triple, relation: { type: 'free', parentId: null, targetAnchorId: null, ownAnchorId: 'origin' } };
}
export function assemblyPreviewMatrix(part: AssemblyPart, matrix: Matrix4, isExploded: boolean) {
  const offset: Record<AssemblyKind, number> = { base: 0, flange: 45, bolt: 90, nut: -45, other: 45 };
  return isExploded ? new Matrix4().makeTranslation(0, 0, offset[part.kind]).multiply(matrix) : matrix;
}
export function assemblyBounds(document: AssemblyDocument, matrices: Map<string, Matrix4>, isExploded: boolean, selectedId: string | null = null) {
  const result = new Box3();
  const bounds: Record<AssemblyKind, [Triple, Triple]> = {
    base: [[-60, -60, -4], [60, 60, 4]], flange: [[-50, -50, -5], [50, 50, 5]],
    bolt: [[-6.5, -6.5, -30], [6.5, 6.5, 5]], nut: [[-7.5, -7.5, -3], [7.5, 7.5, 3]], other: [[-1, -1, -1], [1, 1, 1]],
  };
  for (const part of document.partList.filter((part) => !selectedId || part.id === selectedId)) {
    const half = part.model ? new Vector3(...part.model.size).multiplyScalar(.5) : null;
    const [min, max] = half ? [half.clone().negate().toArray(), half.toArray()] : bounds[part.kind];
    result.union(new Box3(new Vector3(...min), new Vector3(...max)).applyMatrix4(assemblyPreviewMatrix(part, matrices.get(part.id)!, isExploded)));
  }
  return result;
}
