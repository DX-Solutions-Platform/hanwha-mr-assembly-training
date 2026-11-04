import type { ModelSpec } from '@/types/model';

/** 드론 — 중앙에서 사방으로 펼칩니다 */
export const DRONE_MODEL: ModelSpec = {
  id: 'drone', explodeMode: 'radial', explodeScale: 0.42, viewDistance: 1.1,
  sectionList: [
    { code: '01', name: '본체·배터리', summary: '카본 본체 · 배터리', cardIndex: 0, explode: [0, 0.45, 0] },
    { code: '02', name: '암·모터', summary: '암 ×4 · BLDC 모터 ×4', cardIndex: 1, explode: [0.6, 0.05, 0] },
    { code: '03', name: '프로펠러', summary: '프로펠러 ×4', cardIndex: 2, explode: [0, 0.75, 0.3] },
    { code: '04', name: '카메라·짐벌', summary: '3축 짐벌 · 카메라', cardIndex: 3, explode: [0, -0.3, 0.6] },
    { code: '05', name: '랜딩 기어', summary: '랜딩 기어 ×2', cardIndex: 4, explode: [-0.5, -0.35, 0] },
  ],
  partList: [
    { name: '본체', spec: '카본', sectionIndex: 0, shape: 'box', size: [0.3, 0.08, 0.3], position: [0, 0.42, 0], material: 'carbon' },
    { name: '배터리', spec: '6S 5000mAh', sectionIndex: 0, shape: 'box', size: [0.2, 0.06, 0.12], position: [0, 0.49, 0], material: 'battery' },
    { name: '암 A', spec: '카본 튜브', sectionIndex: 1, shape: 'box', size: [0.66, 0.03, 0.04], position: [0, 0.42, 0], material: 'carbon' },
    { name: '암 B', spec: '카본 튜브', sectionIndex: 1, shape: 'box', size: [0.66, 0.03, 0.04], position: [0, 0.42, 0], rotation: [0, Math.PI / 2, 0], material: 'carbon' },
    { name: 'BLDC 모터', spec: '2207 ×4', sectionIndex: 1, shape: 'cylinder', size: [0.04, 0.04, 0.05], position: [0, 0.46, 0], material: 'paintOrange', repeat: { count: 4, mode: 'ring', radius: 0.3, axis: 'y' } },
    { name: '프로펠러', spec: '7인치 ×4', sectionIndex: 2, shape: 'box', size: [0.03, 0.005, 0.32], position: [0, 0.5, 0], material: 'plastic', repeat: { count: 4, mode: 'ring', radius: 0.3, axis: 'y' } },
    { name: '짐벌', spec: '3축', sectionIndex: 3, shape: 'sphere', size: [0.055], position: [0, 0.33, 0.06], material: 'darkSteel' },
    { name: '카메라', spec: '4K', sectionIndex: 3, shape: 'cylinder', size: [0.02, 0.02, 0.03], position: [0, 0.33, 0.12], rotation: [Math.PI / 2, 0, 0], material: 'glass' },
    { name: '랜딩 기어', spec: '×2', sectionIndex: 4, shape: 'box', size: [0.02, 0.16, 0.3], position: [-0.1, 0.3, 0], material: 'carbon', repeat: { count: 2, mode: 'line', step: [0.2, 0, 0] } },
  ],
};
