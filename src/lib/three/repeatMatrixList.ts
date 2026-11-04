import * as THREE from 'three';
import type { RepeatSpec } from '@/types/model';

const AXIS_VECTOR = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

/** 반복 배치(ring·line·grid) → 인스턴스별 변환 행렬 */
export function createRepeatMatrixList(repeat: RepeatSpec): THREE.Matrix4[] {
  const matrixList: THREE.Matrix4[] = [];
  for (let itemIndex = 0; itemIndex < repeat.count; itemIndex++) {
    const matrix = new THREE.Matrix4();
    if (repeat.mode === 'ring') {
      const axis = AXIS_VECTOR[repeat.axis ?? 'y'];
      const angle = (itemIndex / repeat.count) * Math.PI * 2;
      const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      const offset = (repeat.axis === 'x' ? new THREE.Vector3(0, repeat.radius ?? 0.1, 0) : new THREE.Vector3(repeat.radius ?? 0.1, 0, 0)).applyQuaternion(rotation);
      matrix.compose(offset, rotation, new THREE.Vector3(1, 1, 1));
    } else if (repeat.mode === 'line') {
      const [x, y, z] = repeat.step ?? [0.1, 0, 0];
      matrix.makeTranslation(x * itemIndex, y * itemIndex, z * itemIndex);
    } else {
      const columns = repeat.columns ?? 4;
      const [sx, sy, sz] = repeat.step ?? [0.1, 0, 0];
      const [rx, ry, rz] = repeat.rowStep ?? [0, 0, 0.1];
      const column = itemIndex % columns, row = Math.floor(itemIndex / columns);
      matrix.makeTranslation(sx * column + rx * row, sy * column + ry * row, sz * column + rz * row);
    }
    matrixList.push(matrix);
  }
  return matrixList;
}
