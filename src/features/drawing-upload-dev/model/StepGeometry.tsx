import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { BufferGeometry, Color, DoubleSide, GreaterDepth } from 'three';
import { theme } from '@/styles/theme';
import { buildStepGeometry, buildStepStructureGeometry, findShapeAtFace } from './buildStepGeometry';
import { showStepStructureEdges } from './stepStructureEdges';
import type { StepModel, StepPick } from './stepTypes';

export function StepGeometry({ model, selectedShapeIds, isIsolated, onSelect, showThrough, referenceShapeIds, wireframe }: {
  model: StepModel; selectedShapeIds: readonly string[]; isIsolated: boolean; onSelect: (id: string | null, pick?: StepPick) => void;
  showThrough?: boolean; referenceShapeIds?: readonly string[]; wireframe?: boolean;
}) {
  const built = useMemo(() => buildStepGeometry(model, theme.color.inkMuted), [model]);
  const structure = useMemo(() => wireframe ? buildStepStructureGeometry(model) : null, [model, wireframe]);
  const occluded = useMemo(() => showThrough ? new BufferGeometry()
    .setAttribute('position', built.geometry.getAttribute('position'))
    .setIndex(built.geometry.index) : null, [built, showThrough]);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => () => built.geometry.dispose(), [built]);
  useEffect(() => () => occluded?.dispose(), [occluded]);
  useEffect(() => () => structure?.geometry.dispose(), [structure]);
  useEffect(() => {
    const attribute = built.geometry.getAttribute('color');
    (attribute.array as Float32Array).set(built.baseColors);
    const selected = new Set(selectedShapeIds);
    const ranges = built.rangeList.filter((range) => selected.has(range.id));
    const reference = new Set(referenceShapeIds);
    const orange = new Color(theme.color.primary);
    const blue = new Color('#6daddb');
    const neutral = showThrough ? new Color('#abb4be') : null;
    for (const range of built.rangeList) {
      const color = selected.has(range.id) ? orange : reference.has(range.id) ? blue : neutral;
      if (color) {
        for (let index = range.firstVertex; index < range.firstVertex + range.vertexCount; index++) attribute.setXYZ(index, color.r, color.g, color.b);
      }
    }
    attribute.needsUpdate = true;
    // Keep the original face indices when a part spans several mesh ranges.
    built.geometry.clearGroups();
    if (isIsolated && ranges.length) {
      for (const range of ranges) built.geometry.addGroup(range.firstTriangle * 3, range.triangleCount * 3, 0);
    } else {
      built.geometry.addGroup(0, built.geometry.index!.count, 0);
    }
    // Draw only the selected part's hidden surfaces over the assembled model.
    occluded?.clearGroups();
    for (const range of ranges) occluded?.addGroup(range.firstTriangle * 3, range.triangleCount * 3, 0);
    if (structure) {
      const colors = structure.geometry.getAttribute('color');
      const edgeColor = new Color('#deebf3');
      structure.geometry.clearGroups();
      for (const range of structure.rangeList) {
        const color = selected.has(range.id) ? orange : reference.has(range.id) ? blue : edgeColor;
        for (let index = range.firstVertex; index < range.firstVertex + range.vertexCount; index++) colors.setXYZ(index, color.r, color.g, color.b);
        if (isIsolated && selected.has(range.id)) structure.geometry.addGroup(range.firstVertex, range.vertexCount, 0);
      }
      if (!isIsolated || !ranges.length) structure.geometry.addGroup(0, colors.count, 0);
      colors.needsUpdate = true;
    }
    invalidate();
  }, [built, selectedShapeIds, isIsolated, invalidate, occluded, showThrough, referenceShapeIds, structure]);
  return <>
    <mesh geometry={built.geometry} onClick={(event) => {
      if (event.delta > 4 || event.faceIndex == null) return;
      event.stopPropagation();
      onSelect(findShapeAtFace(built.rangeList, event.faceIndex), { point: event.point.toArray(), normal: event.face?.normal.toArray() ?? [0, 0, 1] });
    }}>
      <meshStandardMaterial attach="material-0" vertexColors side={DoubleSide} metalness={0.15} roughness={0.55} visible={!wireframe} />
    </mesh>
    {structure && <lineSegments geometry={structure.geometry} raycast={() => {}}>
      <lineBasicMaterial attach="material-0" vertexColors transparent opacity={0.55} depthWrite={false} toneMapped={false} onBeforeCompile={showStepStructureEdges} />
    </lineSegments>}
    {!wireframe && occluded && <mesh geometry={occluded} renderOrder={1} raycast={() => {}}>
      <meshBasicMaterial attach="material-0" color={theme.color.primary} transparent opacity={0.72}
        depthFunc={GreaterDepth} depthWrite={false} />
    </mesh>}
  </>;
}
