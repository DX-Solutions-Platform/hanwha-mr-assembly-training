import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, Mesh, type Material } from 'three';
import type { DrawingShape, DraftSize } from './draftGeometry';
import type { OrthographicHull } from './orthographicHull';
import { buildStepStool } from './buildStepStool';

function buildHullGeometry({ grid, cells }: OrthographicHull, size: DraftSize) {
  const [nx, ny] = grid, dimensions = [size.width, size.height, size.depth];
  const positions: number[] = [], indices: number[] = [];
  const coords = [0, 0, 0];
  const filled = () => cells[(coords[2] * ny + coords[1]) * nx + coords[0]];
  const point = (axis: number, a: number, u: number, v: number) => {
    const point = [0, 0, 0];
    point[axis] = a; point[(axis + 1) % 3] = u; point[(axis + 2) % 3] = v;
    for (let index = 0; index < 3; index++) positions.push((point[index] / grid[index] - .5) * dimensions[index]);
  };
  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3, v = (axis + 2) % 3;
    const width = grid[u], height = grid[v], mask = new Uint8Array(width * height);
    for (const sign of [-1, 1]) for (let layer = 0; layer < grid[axis]; layer++) {
      const neighbor = layer + sign;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        coords[u] = x; coords[v] = y; coords[axis] = layer;
        const inside = filled();
        coords[axis] = neighbor;
        mask[y * width + x] = inside && (neighbor < 0 || neighbor >= grid[axis] || !filled()) ? 1 : 0;
      }
      // Merge adjacent coplanar grid faces before writing triangles.
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (!mask[y * width + x]) continue;
        let endX = x + 1, endY = y + 1;
        while (endX < width && mask[y * width + endX]) endX++;
        while (endY < height && mask.subarray(endY * width + x, endY * width + endX).every(Boolean)) endY++;
        for (let row = y; row < endY; row++) mask.fill(0, row * width + x, row * width + endX);
        const plane = layer + (sign > 0 ? 1 : 0), first = positions.length / 3;
        point(axis, plane, x, y); point(axis, plane, endX, y);
        point(axis, plane, endX, endY); point(axis, plane, x, endY);
        if (sign > 0) indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
        else indices.push(first, first + 2, first + 1, first, first + 3, first + 2);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function buildDrawingModel(shape: DrawingShape, size: DraftSize, material: Material) {
  if (shape.kind === 'step-stool') return buildStepStool(shape.profile, size, material);
  if (shape.kind === 'isometric') {
    const frame = new Group();
    const sx = size.width / shape.proportions.width, sy = size.height / shape.proportions.height, sz = size.depth / shape.proportions.depth;
    const geometries = shape.solids.map((solid, index) => {
      const geometry = new BoxGeometry(solid.width * sx, solid.height * sy, solid.depth * sz);
      const mesh = new Mesh(geometry, material);
      mesh.name = 'isometric-part-' + (index + 1);
      mesh.position.set(solid.x * sx, solid.y * sy, solid.z * sz);
      frame.add(mesh);
      return geometry;
    });
    return { frame, dispose: () => geometries.forEach((geometry) => geometry.dispose()) };
  }
  const geometry = buildHullGeometry(shape.hull, size);
  const mesh = new Mesh(geometry, material);
  mesh.name = 'orthographic-volume';
  const frame = new Group();
  frame.add(mesh);
  return { frame, dispose: () => geometry.dispose() };
}
