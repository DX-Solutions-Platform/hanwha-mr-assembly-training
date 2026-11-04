import * as THREE from 'three';

/** 화면을 떠날 때 모델 해제 (공유 재질·지오메트리는 유지, 인스턴스 버퍼만 해제) */
export function disposeModel(root: THREE.Object3D) {
  root.traverse((object) => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
  root.removeFromParent();
}
