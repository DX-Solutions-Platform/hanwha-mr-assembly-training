import * as THREE from 'three';

const EDGE_THRESHOLD_DEG = 30;
const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, depthWrite: false });
const edgeGeometryCache = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>();

/** 어두운 배경에서 형태가 보이도록 모서리를 따라 얇고 밝은 선을 붙입니다 (인스턴스 부품은 생략) */
export function attachHairlineEdges(mesh: THREE.Mesh): THREE.LineSegments {
  let edgeGeometry = edgeGeometryCache.get(mesh.geometry);
  if (!edgeGeometry) { edgeGeometry = new THREE.EdgesGeometry(mesh.geometry, EDGE_THRESHOLD_DEG); edgeGeometryCache.set(mesh.geometry, edgeGeometry); }
  const line = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  line.raycast = () => {};
  mesh.add(line);
  return line;
}

/** 와이어프레임 모드에서는 선을 더 밝게 */
export function setEdgeEmphasis(isEmphasized: boolean) {
  edgeMaterial.opacity = isEmphasized ? 0.95 : 0.32;
  edgeMaterial.color.setHex(isEmphasized ? 0xffe6d2 : 0xffffff);
}
