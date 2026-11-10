import { BufferAttribute, BufferGeometry, Color } from 'three';
import { modelScale } from './stepModel';
import { createStepStructureEdges } from './stepStructureEdges';
import type { StepModel } from './stepTypes';

export interface ShapeRange { id: string; firstTriangle: number; triangleCount: number; firstVertex: number; vertexCount: number; }
/** Batch all bodies into one draw call while retaining a range per selectable body. */
export function buildStepGeometry(model: StepModel, fallbackColor: string) {
  const vertexCount = model.meshList.reduce((sum, mesh) => sum + mesh.position.length / 3, 0);
  const indexCount = model.meshList.reduce((sum, mesh) => sum + mesh.index.length, 0);
  const positions = new Float32Array(vertexCount * 3), normals = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3), indices = new Uint32Array(indexCount);
  const scale = modelScale(model.bounds), center = model.bounds.min.map((value, axis) => value + (model.bounds.max[axis] - value) / 2);
  const rangeList: ShapeRange[] = [];
  let vertexOffset = 0, indexOffset = 0, hasNormals = true;
  for (const shape of model.manifest.shapeList) {
    const mesh = model.meshList[shape.meshIndex], color = mesh.color ? new Color(...mesh.color) : new Color(fallbackColor);
    for (let index = 0; index < mesh.position.length; index++) {
      const axis = index % 3;
      positions[vertexOffset * 3 + index] = (mesh.position[index] + (mesh.origin[axis] - center[axis])) * scale;
      colors[vertexOffset * 3 + index] = axis === 0 ? color.r : axis === 1 ? color.g : color.b;
    }
    if (mesh.normal) normals.set(mesh.normal, vertexOffset * 3); else hasNormals = false;
    for (let index = 0; index < mesh.index.length; index++) indices[indexOffset + index] = mesh.index[index] + vertexOffset;
    rangeList.push({ id: shape.id, firstTriangle: indexOffset / 3, triangleCount: mesh.index.length / 3, firstVertex: vertexOffset, vertexCount: mesh.position.length / 3 });
    vertexOffset += mesh.position.length / 3; indexOffset += mesh.index.length;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3)); geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.setAttribute('color', new BufferAttribute(colors.slice(), 3));
  if (hasNormals) geometry.setAttribute('normal', new BufferAttribute(normals, 3)); else geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return { geometry, baseColors: colors, rangeList };
}

export function buildStepStructureGeometry(model: StepModel) {
  const scale = modelScale(model.bounds);
  const center = model.bounds.min.map((value, axis) => value + (model.bounds.max[axis] - value) / 2);
  let vertexCount = 0;
  const ranges = model.manifest.shapeList.map((shape) => {
    const body = model.meshList[shape.meshIndex];
    const source = new BufferGeometry().setAttribute('position', new BufferAttribute(body.position, 3))
      .setIndex(new BufferAttribute(body.index, 1));
    const edges = createStepStructureEdges(source);
    const range = { id: shape.id, firstVertex: vertexCount, vertexCount: edges.getAttribute('position').count };
    vertexCount += range.vertexCount;
    for (const attribute of ['position', 'edgeMidpoint']) {
      const { array } = edges.getAttribute(attribute);
      for (let index = 0; index < array.length; index++) {
        const axis = index % 3;
        array[index] = (array[index] + (body.origin[axis] - center[axis])) * scale;
      }
    }
    source.dispose();
    return { range, edges };
  });
  const geometry = new BufferGeometry().setAttribute('color', new BufferAttribute(new Float32Array(vertexCount * 3), 3));
  for (const attribute of ['position', 'edgeMidpoint', 'faceA', 'faceB']) {
    const values = new Float32Array(vertexCount * 3);
    for (const { range, edges } of ranges) {
      values.set(edges.getAttribute(attribute).array, range.firstVertex * 3);
    }
    geometry.setAttribute(attribute, new BufferAttribute(values, 3));
  }
  for (const { edges } of ranges) edges.dispose();
  return { geometry, rangeList: ranges.map(({ range }) => range) };
}

export function findShapeAtFace(rangeList: ShapeRange[], faceIndex: number) {
  return rangeList.find((range) => faceIndex >= range.firstTriangle && faceIndex < range.firstTriangle + range.triangleCount)?.id ?? null;
}
