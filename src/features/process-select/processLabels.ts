import type * as Three from 'three';
import type { ReferenceThree } from '@/features/education-select/referenceThree';
import type { ProcessCallbacks, ProcessItem, ProcessState } from './processTypes';
import { getProcessSections } from './processSections';

/** seqGo/bootShelf: 각 구간의 Box3 중심 → 오른쪽 공통 열, 최소 간격 96. */
export function updateProcessLabels(T: ReferenceThree, item: ProcessItem, camera: Three.Camera, state: ProcessState, elapsed: number, separation: number, callbacks: ProcessCallbacks) {
  camera.updateMatrixWorld(); item.holder.updateMatrixWorld(true);
  const centers = getProcessSections(item.kind).map((_, index) => {
    const box = new T.Box3(); let hasPart = false;
    item.parts.forEach((part) => { if ((part.object.userData.gi || 0) === index) { box.expandByObject(part.object); hasPart = true; } });
    if (!hasPart) return null;
    const center = box.getCenter(new T.Vector3()).project(camera);
    return { x: (center.x + 1) / 2 * 1920, y: (1 - center.y) / 2 * 1080 };
  });
  const rows = centers.map((center, index) => ({ index, y: center ? center.y - 18 : 0, ok: !!center })).filter((row) => row.ok).sort((a, b) => b.y - a.y);
  for (let order = 1; order < rows.length; order++) if (rows[order - 1].y - rows[order].y < 96) rows[order].y = rows[order - 1].y - 96;
  const rowY = new Map(rows.map((row) => [row.index, row.y]));
  const baseX = Math.max(...centers.filter((center): center is { x: number; y: number } => !!center).map((center) => center.x)) + 220;
  const active = state.selectedSection ?? state.hoveredSection;
  centers.forEach((center, index) => {
    if (!center) return;
    const x = Math.max(baseX, 1240), y = rowY.get(index)!;
    const isVisible = elapsed > 2.4 + index * 0.15 && separation > 0.5 && !state.isReturning;
    callbacks.onLabelPlacement(index, {
      x: x + 14, y: y - 20, points: `${center.x},${center.y} ${x - 40},${y} ${x},${y}`,
      opacity: !isVisible ? '0' : active !== null && active !== index && state.selectedSection !== null ? '0.45' : '1',
      lineOpacity: isVisible ? '1' : '0', background: active === index ? 'rgba(243,115,33,.22)' : 'rgba(8,9,11,.6)', isVisible,
    });
  });
  callbacks.onBackVisible(elapsed > 2.4 && !state.isReturning);
}
