import type { Group } from 'three';
import type { ReferenceThree } from './referenceThree';
import model from './nuriShelfGeometry.json';

// Reduced outer surfaces from the bundled Nuri lesson's GLB. Load only after registration.
export function buildNuriShelfModel(T: ReferenceThree, group: Group) {
  for (const { color, positions, indices } of model) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = new T.MeshStandardMaterial({ color, metalness: 0.12, roughness: 0.65 });
    group.add(new T.Mesh(geometry, material));
  }
}
