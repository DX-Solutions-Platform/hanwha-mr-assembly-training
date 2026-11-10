import type * as Three from 'three';
import type { ReferenceThree } from '@/features/education-select/referenceThree';
import type { ProcessItem, ProcessState } from './processTypes';

export interface ProcessEdges {
  material: Three.LineBasicMaterial;
  lines: Three.LineSegments<Three.EdgesGeometry, Three.LineBasicMaterial>[];
}

export function updateProcessAppearance(T: ReferenceThree, item: ProcessItem, state: ProcessState, wireframe: boolean, edges: ProcessEdges | null) {
  const active = state.selectedSection ?? state.hoveredSection;
  item.parts.forEach((part) => {
    const isActive = active !== null && (part.object.userData.gi || 0) === active;
    const dim = active !== null && !isActive && state.selectedSection !== null && !state.isReturning;
    part.object.traverse((object) => {
      const mesh = object as Three.Mesh<Three.BufferGeometry, Three.MeshStandardMaterial>;
      if (!mesh.isMesh || !mesh.material) return;
      let original = mesh.userData.processMaterial as Three.MeshStandardMaterial | undefined;
      if (!original) {
        if (active === null && !wireframe) return;
        original = mesh.material;
        mesh.userData.processMaterial = original;
        mesh.material = original.clone();
      }
      mesh.material.emissive?.setHex(isActive && !state.isReturning ? 0x6a2a06 : original.emissive?.getHex() ?? 0);
      mesh.material.transparent = dim || original.transparent;
      mesh.material.opacity = dim ? 0.25 : original.opacity;
      mesh.material.visible = !wireframe && original.visible;
    });
  });
  if (wireframe && !edges) {
    const material = new T.LineBasicMaterial({ color: 0xfff6ea, transparent: true, opacity: 0.95, toneMapped: false });
    const lines: ProcessEdges['lines'] = [];
    item.spin.traverse((object) => {
      const mesh = object as Three.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const line = new T.LineSegments(new T.EdgesGeometry(mesh.geometry, 20), material);
      line.raycast = () => {}; mesh.add(line); lines.push(line);
    });
    edges = { material, lines };
  }
  if (edges) edges.material.visible = wireframe;
  return edges;
}

export function clearProcessAppearance(item: ProcessItem, edges: ProcessEdges | null) {
  edges?.lines.forEach((line) => { line.removeFromParent(); line.geometry.dispose(); });
  edges?.material.dispose();
  item.parts.forEach((part) => part.object.traverse((object) => {
    const mesh = object as Three.Mesh<Three.BufferGeometry, Three.MeshStandardMaterial>;
    if (mesh.isMesh && mesh.userData.processMaterial) {
      mesh.material.dispose();
      mesh.material = mesh.userData.processMaterial;
      delete mesh.userData.processMaterial;
    }
  }));
}
