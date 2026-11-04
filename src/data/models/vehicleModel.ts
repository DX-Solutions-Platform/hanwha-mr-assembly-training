import type { ModelSpec } from '@/types/model';

const WHEEL: [number, number, number] = [Math.PI / 2, 0, 0];

/** 차량 — 중앙에서 사방으로 펼칩니다 */
export const VEHICLE_MODEL: ModelSpec = {
  id: 'vehicle', explodeMode: 'radial', explodeScale: 0.55, viewDistance: 1.35,
  sectionList: [
    { code: '01', name: '차체 프레임', summary: '하부 프레임 · 차체 패널', cardIndex: 0, explode: [0, 0.6, 0] },
    { code: '02', name: '바퀴·서스펜션', summary: '휠 ×4 · 허브', cardIndex: 1, explode: [0, -0.15, 0.9] },
    { code: '03', name: '차문', summary: '좌·우 도어', cardIndex: 2, explode: [0, 0.1, -0.9] },
    { code: '04', name: '앞 범퍼·라이트', summary: '범퍼 · 헤드라이트', cardIndex: 3, explode: [0.9, 0, 0] },
    { code: '05', name: '실내', summary: '좌석 · 대시보드', cardIndex: 4, explode: [-0.6, 0.45, 0] },
  ],
  partList: [
    { name: '하부 프레임', spec: '래더 프레임', sectionIndex: 0, shape: 'box', size: [1.5, 0.08, 0.7], position: [0, 0.26, 0], material: 'darkSteel' },
    { name: '차체 패널', spec: 'AL 판넬', sectionIndex: 0, shape: 'box', size: [1.6, 0.3, 0.8], position: [0, 0.45, 0], material: 'paintWhite' },
    { name: '캐빈 글래스', spec: '강화 유리', sectionIndex: 0, shape: 'box', size: [0.85, 0.28, 0.74], position: [-0.12, 0.74, 0], material: 'glass' },
    { name: '휠', spec: '17″ ×4', sectionIndex: 1, shape: 'cylinder', size: [0.19, 0.19, 0.14], position: [-0.52, 0.19, -0.42], rotation: WHEEL, material: 'rubber', repeat: { count: 4, mode: 'grid', columns: 2, step: [1.04, 0, 0], rowStep: [0, 0.84, 0] } },
    { name: '허브', spec: '5홀 ×4', sectionIndex: 1, shape: 'cylinder', size: [0.09, 0.09, 0.15], position: [-0.52, 0.19, -0.42], rotation: WHEEL, material: 'steel', repeat: { count: 4, mode: 'grid', columns: 2, step: [1.04, 0, 0], rowStep: [0, 0.84, 0] } },
    { name: '좌측 도어', spec: 'LH', sectionIndex: 2, shape: 'box', size: [0.62, 0.32, 0.03], position: [-0.08, 0.5, -0.415], material: 'paintOrange' },
    { name: '우측 도어', spec: 'RH', sectionIndex: 2, shape: 'box', size: [0.62, 0.32, 0.03], position: [-0.08, 0.5, 0.415], material: 'paintOrange' },
    { name: '앞 범퍼', spec: 'PP', sectionIndex: 3, shape: 'box', size: [0.08, 0.16, 0.82], position: [0.83, 0.34, 0], material: 'plastic' },
    { name: '헤드라이트', spec: 'LED ×2', sectionIndex: 3, shape: 'box', size: [0.04, 0.06, 0.16], position: [0.81, 0.5, -0.28], material: 'steel', repeat: { count: 2, mode: 'line', step: [0, 0, 0.56] } },
    { name: '좌석', spec: '×2', sectionIndex: 4, shape: 'box', size: [0.22, 0.28, 0.22], position: [-0.2, 0.62, -0.16], material: 'carbon', repeat: { count: 2, mode: 'line', step: [0, 0, 0.32] } },
    { name: '대시보드', spec: 'ABS', sectionIndex: 4, shape: 'box', size: [0.12, 0.12, 0.66], position: [0.22, 0.66, 0], material: 'plastic' },
  ],
};
