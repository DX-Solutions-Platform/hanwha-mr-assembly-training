import type * as Three from 'three';
import type { ReferenceThree } from '@/features/education-select/referenceThree';
import type { SelectionKind } from '@/features/education-select/selectionProducts';
import type { ProcessPart } from './processTypes';

/** Demo 1.dc.html 363행: 선택 모델의 같은 부품에 분해 메타데이터만 부착. */
export function createProcessParts(T: ReferenceThree, model: Three.Group, kind: SelectionKind, bounds: Three.Box3, size: Three.Vector3): ProcessPart[] {
  const center = bounds.getCenter(new T.Vector3()), height = Math.max(0.001, size.y);
  return model.children.map((object, index) => {
    const basePosition = object.position.clone(), direction = basePosition.clone().sub(center);
    const offset = new T.Vector3(direction.x * 1.15, (basePosition.y - center.y) / height * size.y * (kind === 'pump' ? 1.25 : 1.7) + 0.1, direction.z * 1.15);
    if (kind !== 'pump') {
      const count = model.children.length, yRatio = (basePosition.y - bounds.min.y) / height;
      object.userData.gi = kind === 'stool' ? (index < 8 ? 0 : index < 10 ? 1 : 2)
        : kind === 'car' ? (index >= 3 && index < 11 ? 0 : index === 0 || index >= 11 ? 1 : 2)
        : kind === 'drone' ? (index >= count - 4 ? 0 : index < 3 ? 1 : 2) : (yRatio < 0.34 ? 0 : yRatio < 0.68 ? 1 : 2);
    }
    return { object, basePosition, baseRotationY: object.rotation.y, offset };
  });
}
