import type { ModelSpec } from '@/types/model';

/** 스마트폰 — 앞뒤로 겹겹이 펼칩니다 (세워진 상태) */
export const SMARTPHONE_MODEL: ModelSpec = {
  id: 'smartphone', explodeMode: 'radial', explodeScale: 0.5, viewDistance: 1.05,
  sectionList: [
    { code: '01', name: '디스플레이', summary: '커버 글래스 · OLED 패널', cardIndex: 0, explode: [0, 0.05, 1.0] },
    { code: '02', name: '측면 프레임', summary: '알루미늄 프레임 ×4', cardIndex: 1, explode: [0, 0, 0.5] },
    { code: '03', name: '메인보드', summary: 'PCB · 칩 ×6 · 실드', cardIndex: 2, explode: [0.55, 0.15, 0.1] },
    { code: '04', name: '배터리', summary: '배터리 · 플렉스 케이블', cardIndex: 3, explode: [0, -0.2, -0.35] },
    { code: '05', name: '카메라 모듈', summary: '모듈 · 렌즈 ×3', cardIndex: 4, explode: [-0.5, 0.35, -0.2] },
    { code: '06', name: '스피커·진동', summary: '스피커 · 진동 모터', cardIndex: 5, explode: [0.35, -0.5, 0] },
    { code: '07', name: '후면 커버', summary: '후면 글래스 · 카메라 범프', cardIndex: 6, explode: [0, 0, -0.95] },
    { code: '08', name: '버튼·SIM', summary: '측면 버튼 ×3 · SIM 트레이', cardIndex: 7, explode: [-0.6, -0.2, 0.2] },
  ],
  partList: [
    { name: '커버 글래스', spec: '0.6 mm', sectionIndex: 0, shape: 'box', size: [0.45, 0.95, 0.01], position: [0, 0.6, 0.023], material: 'glass' },
    { name: 'OLED 패널', spec: '6.1″', sectionIndex: 0, shape: 'box', size: [0.44, 0.94, 0.006], position: [0, 0.6, 0.015], material: 'darkSteel' },
    { name: '측면 프레임', spec: 'AL ×2', sectionIndex: 1, shape: 'box', size: [0.012, 0.95, 0.045], position: [-0.226, 0.6, 0], material: 'aluminum', repeat: { count: 2, mode: 'line', step: [0.452, 0, 0] } },
    { name: '상하 프레임', spec: 'AL ×2', sectionIndex: 1, shape: 'box', size: [0.45, 0.012, 0.045], position: [0, 0.126, 0], material: 'aluminum', repeat: { count: 2, mode: 'line', step: [0, 0.948, 0] } },
    { name: '메인보드', spec: '10층 PCB', sectionIndex: 2, shape: 'box', size: [0.3, 0.32, 0.006], position: [0.04, 0.86, 0], material: 'pcb' },
    { name: '칩셋', spec: 'SoC · 메모리 ×6', sectionIndex: 2, shape: 'box', size: [0.05, 0.05, 0.006], position: [-0.03, 0.94, 0.006], material: 'darkSteel', repeat: { count: 6, mode: 'grid', columns: 3, step: [0.07, 0, 0], rowStep: [0, -0.07, 0] } },
    { name: '실드 캔', spec: 'SUS', sectionIndex: 2, shape: 'box', size: [0.12, 0.1, 0.01], position: [0.12, 0.76, 0.006], material: 'steel' },
    { name: '배터리', spec: '3,200 mAh', sectionIndex: 3, shape: 'box', size: [0.34, 0.48, 0.012], position: [0, 0.42, -0.004], material: 'battery' },
    { name: '플렉스 케이블', spec: 'FPC', sectionIndex: 3, shape: 'box', size: [0.04, 0.12, 0.002], position: [0.12, 0.7, 0.004], material: 'copper' },
    { name: '카메라 모듈', spec: '48 MP', sectionIndex: 4, shape: 'box', size: [0.14, 0.14, 0.02], position: [-0.12, 0.96, -0.008], material: 'darkSteel' },
    { name: '렌즈', spec: '×3', sectionIndex: 4, shape: 'cylinder', size: [0.025, 0.025, 0.012], position: [-0.15, 0.99, -0.02], rotation: [Math.PI / 2, 0, 0], material: 'glass', repeat: { count: 3, mode: 'grid', columns: 2, step: [0.06, 0, 0], rowStep: [0, 0, 0.06] } },
    { name: '스피커', spec: '스테레오', sectionIndex: 5, shape: 'box', size: [0.1, 0.03, 0.015], position: [0.08, 0.16, 0], material: 'plastic' },
    { name: '진동 모터', spec: '선형', sectionIndex: 5, shape: 'box', size: [0.06, 0.04, 0.012], position: [-0.12, 0.18, 0], material: 'steel' },
    { name: '후면 글래스', spec: '0.5 mm', sectionIndex: 6, shape: 'box', size: [0.45, 0.95, 0.008], position: [0, 0.6, -0.024], material: 'glass' },
    { name: '카메라 범프', spec: '사파이어', sectionIndex: 6, shape: 'box', size: [0.17, 0.17, 0.012], position: [-0.12, 0.96, -0.032], material: 'glass' },
    { name: '측면 버튼', spec: '×3', sectionIndex: 7, shape: 'box', size: [0.008, 0.06, 0.012], position: [-0.234, 0.85, 0], material: 'aluminum', repeat: { count: 3, mode: 'line', step: [0, -0.08, 0] } },
    { name: 'SIM 트레이', spec: 'nano', sectionIndex: 7, shape: 'box', size: [0.006, 0.08, 0.01], position: [0.234, 0.55, 0], material: 'aluminum' },
  ],
  exteriorList: [
    { name: '디스플레이', anchor: [0, 0.6, 0.03] }, { name: '측면 프레임', anchor: [0.23, 0.35, 0] }, { name: '카메라 범프', anchor: [-0.12, 0.96, -0.04] },
    { name: '측면 버튼', anchor: [-0.24, 0.8, 0] }, { name: '후면 글래스', anchor: [0.1, 0.4, -0.03] },
  ],
};
