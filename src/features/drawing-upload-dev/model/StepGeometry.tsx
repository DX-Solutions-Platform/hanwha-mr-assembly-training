import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Color, DoubleSide } from 'three';
import { theme } from '@/styles/theme';
import { buildStepGeometry, findShapeAtFace } from './buildStepGeometry';
import type { StepModel } from './stepTypes';

export function StepGeometry({ model, selectedId, isIsolated, onSelect }: { model: StepModel; selectedId: string | null; isIsolated: boolean; onSelect: (id: string | null) => void }) {
  const built = useMemo(() => buildStepGeometry(model, theme.color.inkMuted), [model]);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => () => built.geometry.dispose(), [built]);
  useEffect(() => {
    const attribute = built.geometry.getAttribute('color');
    (attribute.array as Float32Array).set(built.baseColors);
    const range = built.rangeList.find((item) => item.id === selectedId);
    if (range) {
      const color = new Color(theme.color.primary);
      for (let index = range.firstVertex; index < range.firstVertex + range.vertexCount; index++) attribute.setXYZ(index, color.r, color.g, color.b);
    }
    attribute.needsUpdate = true;
    built.geometry.setDrawRange(isIsolated && range ? range.firstTriangle * 3 : 0, isIsolated && range ? range.triangleCount * 3 : Infinity);
    invalidate();
  }, [built, selectedId, isIsolated, invalidate]);
  return <mesh geometry={built.geometry} onClick={(event) => {
    if (event.delta > 4 || event.faceIndex == null) return;
    event.stopPropagation(); onSelect(findShapeAtFace(built.rangeList, event.faceIndex));
  }}>
    <meshStandardMaterial vertexColors side={DoubleSide} metalness={0.15} roughness={0.55} />
  </mesh>;
}
