import type { AssemblyAnchor, AssemblyDocument, AssemblyKind, AssemblyPart, Triple } from './assemblyTypes';

export const ASSEMBLY_TEMPLATE_ID = 'flange-base-m8-v1';
export const FLANGE_EXAMPLE_VALUES = {
  parameters: { outerDiameter: 100, innerDiameter: 30, thickness: 10, pitchCircleDiameter: 70, holeDiameter: 9, holeCount: 4, startAngle: 45 },
  part: { partNumber: 'FLG-001', name: '플랜지', material: 'AL6061', quantity: '1' },
};
export const HOLE_CENTER_LIST = Array.from({ length: 4 }, (_, index): Triple => {
  const angle = (45 + index * 90) * Math.PI / 180;
  return [35 * Math.cos(angle), 35 * Math.sin(angle), 0];
});
export function getAssemblyAnchors(kind: AssemblyKind): AssemblyAnchor[] {
  const origin: AssemblyAnchor = { id: 'origin', label: '부품 중심', position: [0, 0, 0] };
  if (kind === 'bolt') return [origin, { id: 'seat', label: '머리 밑면', position: [0, 0, 0] }, { id: 'tip', label: '볼트 끝', position: [0, 0, -30] }, { id: 'nut-seat', label: '너트 체결 기준점', position: [0, 0, -18] }];
  if (kind === 'nut') return [origin, { id: 'top', label: '너트 윗면', position: [0, 0, 3] }, { id: 'bottom', label: '너트 아랫면', position: [0, 0, -3] }];
  const half = kind === 'base' ? 4 : 5;
  return [origin, { id: 'top', label: '윗면 중심', position: [0, 0, half] }, { id: 'bottom', label: '아랫면 중심', position: [0, 0, -half] },
    ...HOLE_CENTER_LIST.flatMap(([x, y], index): AssemblyAnchor[] => [
      { id: 'hole-' + (index + 1) + '-top', label: '구멍 ' + (index + 1) + ' · 윗면', position: [x, y, half] },
      { id: 'hole-' + (index + 1) + '-bottom', label: '구멍 ' + (index + 1) + ' · 아랫면', position: [x, y, -half] },
    ])];
}
export function getPartAnchors(part: AssemblyPart): AssemblyAnchor[] {
  if (!part.model) return getAssemblyAnchors(part.kind);
  const half = part.model.size[2] / 2;
  return [
    { id: 'origin', label: '모델 중심', position: [0, 0, 0] },
    { id: 'top', label: '모델 윗면 기준', position: [0, 0, half] },
    { id: 'bottom', label: '모델 아랫면 기준', position: [0, 0, -half] },
  ];
}
function part(id: string, kind: AssemblyKind, name: string, partNumber: string, parentId: string | null, targetAnchorId: string | null, ownAnchorId: string, type: AssemblyPart['relation']['type']): AssemblyPart {
  return { id, kind, name, partNumber, position: [0, 0, 0], rotation: [0, 0, 0], relation: { type, parentId, targetAnchorId, ownAnchorId } };
}
export function createAssemblyExample(): AssemblyDocument {
  return { format: 'hanwha-assembly', schemaVersion: 1, templateId: ASSEMBLY_TEMPLATE_ID, name: '플랜지 · 베이스판 체결 예시', unit: 'mm', angleUnit: 'deg', updatedAt: new Date().toISOString(), partList: [
    part('base', 'base', '베이스판', 'BASE-001', null, null, 'origin', 'free'),
    part('flange', 'flange', '플랜지', 'FLG-001', 'base', 'top', 'bottom', 'fixed'),
    ...Array.from({ length: 4 }, (_, index) => part('bolt-' + (index + 1), 'bolt', '볼트 ' + (index + 1), 'BOLT-M8-30', 'flange', 'hole-' + (index + 1) + '-top', 'seat', 'insert')),
    ...Array.from({ length: 4 }, (_, index) => part('nut-' + (index + 1), 'nut', '너트 ' + (index + 1), 'NUT-M8', 'bolt-' + (index + 1), 'nut-seat', 'top', 'thread')),
  ] };
}
