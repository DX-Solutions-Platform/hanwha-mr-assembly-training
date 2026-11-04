import type * as Three from 'three';
import type { ReferenceThree } from '@/features/education-select/referenceThree';
import type { ProcessItem, ProcessState } from './processTypes';

export interface ProcessEdges { meshes: Three.Mesh[]; lines: Three.LineSegments<Three.EdgesGeometry, Three.LineBasicMaterial>[]; }

/** 원본 seqOn 경로: 부품 강조·선택 외 25%·EdgesGeometry(20). */
export function updateProcessAppearance(T: ReferenceThree, item: ProcessItem, state: ProcessState, dt: number, wireframe: boolean, previous: ProcessEdges | null): ProcessEdges {
  const active = state.selectedSection ?? state.hoveredSection;
  item.parts.forEach((part) => {
    const isActive = active !== null && (part.object.userData.gi || 0) === active;
    const dim = active !== null && !isActive && state.selectedSection !== null && !state.isReturning;
    part.object.traverse((object) => {
      const mesh = object as Three.Mesh<Three.BufferGeometry, Three.MeshStandardMaterial>;
      if (!mesh.isMesh || !mesh.material) return;
      if (!mesh.userData.hm) {
        mesh.material = mesh.material.clone(); mesh.userData.hm = true;
        mesh.userData.e0 = mesh.material.emissive?.getHex() ?? 0; mesh.userData.op0 = mesh.material.opacity;
      }
      mesh.material.emissive?.setHex(isActive && !state.isReturning ? 0x6a2a06 : mesh.userData.e0);
      mesh.material.transparent = dim || mesh.userData.op0 < 1; mesh.material.opacity = dim ? 0.25 : mesh.userData.op0;
    });
  });
  const edges = previous ?? { meshes: [], lines: [] };
  if (!previous) {
    item.spin.traverse((object) => { const mesh = object as Three.Mesh; if (mesh.isMesh && mesh.geometry) edges.meshes.push(mesh); });
    edges.meshes.forEach((mesh) => {
      const line = new T.LineSegments(new T.EdgesGeometry(mesh.geometry, 20), new T.LineBasicMaterial({ color: 0xfff6ea, transparent: true, opacity: 0, toneMapped: false }));
      line.raycast = () => {}; mesh.add(line); edges.lines.push(line);
    });
  }
  edges.meshes.forEach((mesh) => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => { material.visible = !wireframe; }));
  edges.lines.forEach((line) => { line.material.opacity += ((state.isReturning ? 0 : wireframe ? 0.95 : 0.42) - line.material.opacity) * Math.min(1, dt * 5); });
  return edges;
}

export function clearProcessAppearance(item: ProcessItem, edges: ProcessEdges | null) {
  edges?.lines.forEach((line) => { line.removeFromParent(); line.geometry.dispose(); line.material.dispose(); });
  item.parts.forEach((part) => part.object.traverse((object) => {
    const mesh = object as Three.Mesh<Three.BufferGeometry, Three.MeshStandardMaterial>;
    if (mesh.isMesh && mesh.material && mesh.userData.hm) {
      mesh.material.visible = true; mesh.material.opacity = mesh.userData.op0; mesh.material.transparent = mesh.userData.op0 < 1;
      mesh.material.emissive?.setHex(mesh.userData.e0);
    }
  }));
}
