import type { BufferGeometry } from 'three';
import type { ReferenceThree } from '@/features/education-select/referenceThree';

export function createStepWireGeometry(three: ReferenceThree, source: BufferGeometry) {
  const geometry = new three.EdgesGeometry(source, 24);
  const edges = geometry.getAttribute('position');
  const edgeVertices = edges.count;
  const positions = source.getAttribute('position');
  const normals = source.getAttribute('normal');
  const index = source.index;
  const count = index?.count ?? positions.count;
  if (!count) return { geometry, edgeVertices };

  source.computeBoundingBox();
  const center = source.boundingBox!.getCenter(new three.Vector3());
  const corners = [new three.Vector3(), new three.Vector3(), new three.Vector3()];
  const normal = new three.Vector3();
  const other = new three.Vector3();
  const hits = [new three.Vector3(), new three.Vector3()];
  const sections: number[] = [];

  // Flat faces need only their boundary. Center sections give curved surfaces a readable profile.
  for (let offset = 0; offset < count; offset += 3) {
    const a = index?.getX(offset) ?? offset;
    const b = index?.getX(offset + 1) ?? offset + 1;
    const c = index?.getX(offset + 2) ?? offset + 2;
    if (edgeVertices && normals) {
      normal.fromBufferAttribute(normals, a);
      if (normal.distanceToSquared(other.fromBufferAttribute(normals, b)) < 0.001 &&
          normal.distanceToSquared(other.fromBufferAttribute(normals, c)) < 0.001) continue;
    }
    corners[0].fromBufferAttribute(positions, a);
    corners[1].fromBufferAttribute(positions, b);
    corners[2].fromBufferAttribute(positions, c);

    for (let axis = 0; axis < 3; axis++) {
      const level = center.getComponent(axis);
      let intersections = 0;
      for (let i = 0; i < 3; i++) {
        const start = corners[i], end = corners[(i + 1) % 3];
        const from = start.getComponent(axis) - level;
        const to = end.getComponent(axis) - level;
        if ((from < 0) === (to < 0)) continue;
        hits[intersections++].copy(start).lerp(end, from / (from - to));
      }
      const [start, end] = hits;
      if (intersections === 2 && start.distanceToSquared(end) > 0) {
        sections.push(start.x, start.y, start.z, end.x, end.y, end.z);
      }
    }
  }
  if (sections.length) {
    const vertices = new Float32Array(edges.array.length + sections.length);
    vertices.set(edges.array);
    vertices.set(sections, edges.array.length);
    geometry.setAttribute('position', new three.BufferAttribute(vertices, 3));
  }
  return { geometry, edgeVertices };
}
