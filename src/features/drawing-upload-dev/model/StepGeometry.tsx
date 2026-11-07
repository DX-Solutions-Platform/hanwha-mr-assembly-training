import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Color, DoubleSide } from 'three';
import { theme } from '@/styles/theme';
import { buildStepGeometry, findShapeAtFace } from './buildStepGeometry';
import type { StepModel } from './stepTypes';

export function StepGeometry({ model, selectedShapeIds, isIsolated, onSelect }: {
  model: StepModel; selectedShapeIds: readonly string[]; isIsolated: boolean; onSelect: (id: string | null) => void;
}) {
  const built = useMemo(() => buildStepGeometry(model, theme.color.inkMuted), [model]);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => () => built.geometry.dispose(), [built]);
  useEffect(() => {
    const attribute = built.geometry.getAttribute('color');
    (attribute.array as Float32Array).set(built.baseColors);
    const selected = new Set(selectedShapeIds);
    const ranges = built.rangeList.filter((range) => selected.has(range.id));
    const color = new Color(theme.color.primary);
    for (const range of ranges) {
      for (let index = range.firstVertex; index < range.firstVertex + range.vertexCount; index++) attribute.setXYZ(index, color.r, color.g, color.b);
    }
    attribute.needsUpdate = true;
    // Keep the original face indices when a part spans several mesh ranges.
    built.geometry.clearGroups();
    if (isIsolated && ranges.length) {
      for (const range of ranges) built.geometry.addGroup(range.firstTriangle * 3, range.triangleCount * 3, 0);
    } else {
      built.geometry.addGroup(0, built.geometry.index!.count, 0);
    }
    invalidate();
  }, [built, selectedShapeIds, isIsolated, invalidate]);
  return <mesh geometry={built.geometry} onClick={(event) => {
    if (event.delta > 4 || event.faceIndex == null) return;
    event.stopPropagation(); onSelect(findShapeAtFace(built.rangeList, event.faceIndex));
  }}>
    <meshStandardMaterial attach="material-0" vertexColors side={DoubleSide} metalness={0.15} roughness={0.55} />
  </mesh>;
}
