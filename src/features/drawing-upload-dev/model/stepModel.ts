import { STEP_IMPORTER, type StepBounds, type StepManifest, type StepMesh, type StepModel, type StepNode } from './stepTypes';

export function createStepModel(file: { name: string; size: number }, sha256: string, root: StepNode, meshList: StepMesh[]): StepModel {
  const pathMap = new Map<number, string>();
  function visit(node: StepNode, parent: string, depth: number) {
    if (depth > 100) throw new Error('조립 계층이 너무 깊습니다.');
    const path = [parent, node.name].filter(Boolean).join(' / ');
    for (const index of node.meshes) pathMap.set(index, path);
    for (const child of node.children) visit(child, path, depth + 1);
  }
  visit(root, '', 0);
  const bounds: StepBounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  const shapeList = meshList.map((mesh, meshIndex) => {
    for (let axis = 0; axis < 3; axis++) {
      bounds.min[axis] = Math.min(bounds.min[axis], mesh.bounds.min[axis]);
      bounds.max[axis] = Math.max(bounds.max[axis], mesh.bounds.max[axis]);
    }
    return { id: 'shape-' + meshIndex, name: mesh.name, path: pathMap.get(meshIndex) ?? '', meshIndex, triangleCount: mesh.index.length / 3, bounds: mesh.bounds };
  });
  if (!shapeList.length || bounds.min.some((value) => !Number.isFinite(value)) || bounds.max.some((value) => !Number.isFinite(value))) throw new Error('모델의 범위를 읽지 못했습니다.');
  return { manifest: { sha256, name: file.name, size: file.size, importer: STEP_IMPORTER, unit: 'mm', shapeList }, root, meshList, bounds };
}
export function sameStepModel(first: StepManifest | null, second: StepManifest | null): boolean {
  return !!first && !!second && first.sha256 === second.sha256 && first.size === second.size && first.importer === second.importer && first.unit === second.unit
    && JSON.stringify(first.shapeList) === JSON.stringify(second.shapeList);
}
export function shapeLabel(shape: { name: string; id: string }) {
  return shape.name || '이름 없는 형상 ' + (Number(shape.id.replace('shape-', '')) + 1);
}
export function modelScale(bounds: StepBounds) {
  return 2 / Math.max(...bounds.min.map((value, axis) => bounds.max[axis] - value), 0.000001);
}
