import { BufferGeometry, Float32BufferAttribute, Triangle, Vector3, type Material } from 'three';

const creaseThreshold = Math.cos(50 * Math.PI / 180);
const planarThreshold = Math.cos(0.1 * Math.PI / 180);
const zero = new Vector3();

export function createStepStructureEdges(source: BufferGeometry) {
  const position = source.getAttribute('position');
  const indices = source.getIndex()!;
  const welded = new Uint32Array(position.count);
  const vertices = new Map<string, number>();
  // STEP faces can use separate vertices for the same point on a shared edge.
  for (let index = 0; index < position.count; index++) {
    const key = `${Math.round(position.getX(index) * 1e4)},${Math.round(position.getY(index) * 1e4)},${Math.round(position.getZ(index) * 1e4)}`;
    if (!vertices.has(key)) vertices.set(key, vertices.size);
    welded[index] = vertices.get(key)!;
  }

  const points: number[] = [], midpoints: number[] = [], faceA: number[] = [], faceB: number[] = [];
  const pending = new Map<number, { start: number; end: number; normal: Vector3 }>();
  const triangle = new Triangle();
  const append = (start: number, end: number, first = zero, second = zero) => {
    const x = (position.getX(start) + position.getX(end)) / 2;
    const y = (position.getY(start) + position.getY(end)) / 2;
    const z = (position.getZ(start) + position.getZ(end)) / 2;
    for (const vertex of [start, end]) {
      points.push(position.getX(vertex), position.getY(vertex), position.getZ(vertex));
      midpoints.push(x, y, z);
      faceA.push(first.x, first.y, first.z);
      faceB.push(second.x, second.y, second.z);
    }
  };
  for (let index = 0; index < indices.count; index += 3) {
    const a = indices.getX(index), b = indices.getX(index + 1), c = indices.getX(index + 2);
    if (welded[a] === welded[b] || welded[b] === welded[c] || welded[c] === welded[a]) continue;
    triangle.a.fromBufferAttribute(position, a);
    triangle.b.fromBufferAttribute(position, b);
    triangle.c.fromBufferAttribute(position, c);
    const normal = triangle.getNormal(new Vector3());
    if (normal.lengthSq() === 0) continue;
    for (const [start, end] of [[a, b], [b, c], [c, a]]) {
      const key = welded[start] * vertices.size + welded[end];
      const reverse = welded[end] * vertices.size + welded[start];
      const neighbor = pending.get(reverse);
      if (neighbor) {
        const normalDot = normal.dot(neighbor.normal);
        if (normalDot <= creaseThreshold) append(start, end);
        else if (normalDot < planarThreshold) append(start, end, normal, neighbor.normal);
        pending.delete(reverse);
      } else if (!pending.has(key)) {
        pending.set(key, { start, end, normal });
      }
    }
  }
  for (const { start, end } of pending.values()) append(start, end);
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(points, 3))
    .setAttribute('edgeMidpoint', new Float32BufferAttribute(midpoints, 3))
    .setAttribute('faceA', new Float32BufferAttribute(faceA, 3))
    .setAttribute('faceB', new Float32BufferAttribute(faceB, 3));
}

// A smooth edge forms a contour only where its adjacent faces face opposite ways.
export const showStepStructureEdges: Material['onBeforeCompile'] = (shader) => {
  shader.vertexShader = `attribute vec3 edgeMidpoint; attribute vec3 faceA; attribute vec3 faceB;\n${shader.vertexShader}`.replace(
    '#include <project_vertex>',
    `#include <project_vertex>
    vec3 view = isOrthographic ? vec3(0.0, 0.0, -1.0) : (modelViewMatrix * vec4(edgeMidpoint, 1.0)).xyz;
    float sideA = dot(normalMatrix * faceA, view);
    float sideB = dot(normalMatrix * faceB, view);
    if (sideA * sideB > 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);`,
  );
};
