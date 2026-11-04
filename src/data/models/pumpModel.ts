import type { ModelSpec } from '@/types/model';

const SIDE: [number, number, number] = [0, 0, Math.PI / 2];

/** 유압 펌프 — 세로로 길어 대각선으로 펼칩니다 */
export const PUMP_MODEL: ModelSpec = {
  id: 'hydraulic-pump', explodeMode: 'diagonal', explodeScale: 0.34, viewDistance: 1,
  sectionList: [
    { code: '01', name: '베이스·모터 하우징', summary: '베이스 판 · 모터 하우징 · 냉각 핀', cardIndex: 0 },
    { code: '02', name: '모터 내부', summary: '고정자 · 회전자 · 베어링 · 축', cardIndex: 1 },
    { code: '03', name: '펌프부', summary: '커플링 · 펌프 바디 · 기어', cardIndex: 2 },
    { code: '04', name: '밸브 블록·캡', summary: '밸브 블록 · 상부 캡 · 고정 볼트', cardIndex: 3 },
  ],
  partList: [
    { name: '베이스 판', spec: 'SS400 · 900×620', sectionIndex: 0, shape: 'box', size: [0.9, 0.05, 0.62], position: [0, 0.025, 0], material: 'darkSteel' },
    { name: '방진 패드', spec: 'NBR ×4', sectionIndex: 0, shape: 'cylinder', size: [0.03, 0.03, 0.02], position: [-0.38, 0.06, -0.24], material: 'rubber', repeat: { count: 4, mode: 'grid', columns: 2, step: [0.76, 0, 0], rowStep: [0, 0, 0.48] } },
    { name: '모터 하우징', spec: '3.7 kW · IP55', sectionIndex: 0, shape: 'cylinder', size: [0.17, 0.17, 0.42], position: [-0.18, 0.25, 0], rotation: SIDE, material: 'paintBlue' },
    { name: '냉각 핀', spec: 'AL ×7', sectionIndex: 0, shape: 'torus', size: [0.176, 0.006], position: [-0.33, 0.25, 0], rotation: [0, Math.PI / 2, 0], material: 'aluminum', repeat: { count: 7, mode: 'line', step: [0, 0, 0.05] } },
    { name: '엔드 캡', spec: 'AL', sectionIndex: 0, shape: 'cylinder', size: [0.18, 0.18, 0.04], position: [-0.41, 0.25, 0], rotation: SIDE, material: 'paintBlue' },
    { name: '고정자 코일', spec: 'Cu · 4극', sectionIndex: 1, shape: 'cylinder', size: [0.13, 0.13, 0.3], position: [-0.18, 0.25, 0], rotation: SIDE, material: 'copper' },
    { name: '회전자', spec: 'S45C', sectionIndex: 1, shape: 'cylinder', size: [0.06, 0.06, 0.34], position: [-0.18, 0.25, 0], rotation: SIDE, material: 'steel' },
    { name: '베어링', spec: '6205ZZ ×2', sectionIndex: 1, shape: 'torus', size: [0.035, 0.012], position: [-0.36, 0.25, 0], rotation: [0, Math.PI / 2, 0], material: 'steel', repeat: { count: 2, mode: 'line', step: [0, 0, 0.36] } },
    { name: '구동 축', spec: 'Ø25', sectionIndex: 1, shape: 'cylinder', size: [0.02, 0.02, 0.62], position: [-0.02, 0.25, 0], rotation: SIDE, material: 'steel' },
    { name: '커플링', spec: 'Jaw 75', sectionIndex: 2, shape: 'cylinder', size: [0.07, 0.07, 0.08], position: [0.12, 0.25, 0], rotation: SIDE, material: 'darkSteel' },
    { name: '펌프 바디', spec: 'FC250', sectionIndex: 2, shape: 'box', size: [0.22, 0.26, 0.24], position: [0.29, 0.25, 0], material: 'aluminum' },
    { name: '기어 쌍', spec: 'm2 · 14T', sectionIndex: 2, shape: 'cylinder', size: [0.06, 0.06, 0.05], position: [0.29, 0.25, -0.06], rotation: [Math.PI / 2, 0, 0], material: 'steel', repeat: { count: 2, mode: 'line', step: [0, 0.12, 0] } },
    { name: '토출 포트', spec: 'G3/4', sectionIndex: 2, shape: 'cylinder', size: [0.035, 0.035, 0.08], position: [0.29, 0.25, 0.16], rotation: [Math.PI / 2, 0, 0], material: 'steel' },
    { name: '밸브 블록', spec: 'NG6', sectionIndex: 3, shape: 'box', size: [0.18, 0.12, 0.2], position: [0.29, 0.44, 0], material: 'darkSteel' },
    { name: '상부 캡', spec: 'AL', sectionIndex: 3, shape: 'cylinder', size: [0.09, 0.09, 0.06], position: [0.29, 0.53, 0], material: 'paintBlue' },
    { name: '고정 볼트', spec: 'M6 ×4', sectionIndex: 3, shape: 'cylinder', size: [0.011, 0.011, 0.03], position: [0.23, 0.515, -0.07], material: 'steel', repeat: { count: 4, mode: 'grid', columns: 2, step: [0.12, 0, 0], rowStep: [0, 0, 0.14] } },
  ],
};
