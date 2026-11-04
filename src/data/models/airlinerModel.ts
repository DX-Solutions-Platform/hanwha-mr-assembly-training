import type { ModelSpec } from '@/types/model';

const ALONG_X: [number, number, number] = [0, 0, -Math.PI / 2];
const RING_X: [number, number, number] = [0, Math.PI / 2, 0];

/** 여객기 — 공정 8개 · 반복 부품(프레임·리브·좌석·블레이드)은 인스턴스로 그립니다 */
export const AIRLINER_MODEL: ModelSpec = {
  id: 'airliner', explodeMode: 'radial', explodeScale: 1.1, viewDistance: 2.8,
  sectionList: [
    { code: '01', name: '기수·조종석', summary: '레이돔 · 조종석 창 · 기수 구조', cardIndex: 0, explode: [1.3, 0.25, 0] },
    { code: '02', name: '전방 동체', summary: '프레임 링 ×7 · 바닥 빔 · 외피', cardIndex: 1, explode: [0.45, 0.7, 0] },
    { code: '03', name: '후방 동체', summary: '프레임 링 ×7 · 꼬리 원뿔', cardIndex: 2, explode: [-0.6, 0.6, 0] },
    { code: '04', name: '객실 내장', summary: '좌석 ×40 · 선반 ×2 · 갤리', cardIndex: 3, explode: [0.1, 1.35, 0] },
    { code: '05', name: '주날개', summary: '날개 ×2 · 리브 ×16 · 플랩 ×2', cardIndex: 4, explode: [0, -0.15, 0] },
    { code: '06', name: '엔진 나셀·팬', summary: '나셀 ×2 · 팬 블레이드 ×36', cardIndex: 5, explode: [0.6, -0.7, 0] },
    { code: '07', name: '엔진 코어', summary: '압축기 · 연소실 · 터빈', cardIndex: 6, explode: [-0.2, -1.05, 0] },
    { code: '08', name: '꼬리날개', summary: '수직 안정판 · 수평 안정판 ×2 · 방향타', cardIndex: 7, explode: [-1.2, 0.5, 0] },
  ],
  partList: [
    { name: '기수 구조', spec: 'AL 2024', sectionIndex: 0, shape: 'cone', size: [0.34, 0.7], position: [2.05, 0.9, 0], rotation: ALONG_X, material: 'paintWhite' },
    { name: '레이돔', spec: '복합재', sectionIndex: 0, shape: 'sphere', size: [0.1], position: [2.38, 0.9, 0], material: 'darkSteel' },
    { name: '조종석 창', spec: '적층 유리', sectionIndex: 0, shape: 'box', size: [0.26, 0.08, 0.4], position: [1.86, 1.08, 0], rotation: [0, 0, -0.35], material: 'glass' },
    { name: '전방 외피', spec: 'AL 2024', sectionIndex: 1, shape: 'cylinder', size: [0.34, 0.34, 1.3], position: [1.05, 0.9, 0], rotation: ALONG_X, material: 'paintWhite' },
    { name: '전방 프레임 링', spec: '×7', sectionIndex: 1, shape: 'torus', size: [0.33, 0.012], position: [0.5, 0.9, 0], rotation: RING_X, material: 'aluminum', repeat: { count: 7, mode: 'line', step: [0, 0, 0.18] } },
    { name: '바닥 빔', spec: 'AL 7075', sectionIndex: 1, shape: 'box', size: [1.3, 0.03, 0.5], position: [1.05, 0.72, 0], material: 'aluminum' },
    { name: '노즈 기어', spec: '스트럿 · 휠 ×2', sectionIndex: 1, shape: 'cylinder', size: [0.02, 0.02, 0.36], position: [1.6, 0.42, 0], material: 'steel' },
    { name: '후방 외피', spec: 'AL 2024', sectionIndex: 2, shape: 'cylinder', size: [0.34, 0.34, 1.4], position: [-0.3, 0.9, 0], rotation: ALONG_X, material: 'paintWhite' },
    { name: '후방 프레임 링', spec: '×7', sectionIndex: 2, shape: 'torus', size: [0.33, 0.012], position: [-0.95, 0.9, 0], rotation: RING_X, material: 'aluminum', repeat: { count: 7, mode: 'line', step: [0, 0, 0.18] } },
    { name: '꼬리 원뿔', spec: 'AL 2024', sectionIndex: 2, shape: 'cone', size: [0.34, 0.9], position: [-1.45, 0.95, 0], rotation: [0, 0, Math.PI / 2], material: 'paintWhite' },
    { name: '객실 좌석', spec: '×40', sectionIndex: 3, shape: 'box', size: [0.1, 0.14, 0.1], position: [-0.75, 0.81, -0.2], material: 'carbon', repeat: { count: 40, mode: 'grid', columns: 4, step: [0, 0, 0.13], rowStep: [0.17, 0, 0] } },
    { name: '오버헤드 선반', spec: '×2', sectionIndex: 3, shape: 'box', size: [2.2, 0.06, 0.08], position: [0.2, 1.1, -0.24], material: 'paintWhite', repeat: { count: 2, mode: 'line', step: [0, 0, 0.48] } },
    { name: '갤리', spec: '주방 모듈', sectionIndex: 3, shape: 'box', size: [0.2, 0.3, 0.4], position: [1.5, 0.9, 0], material: 'steel' },
    { name: '좌측 주날개', spec: '복합재', sectionIndex: 4, shape: 'box', size: [0.8, 0.05, 1.8], position: [0.15, 0.72, -1.15], rotation: [0, 0.35, 0], material: 'paintWhite' },
    { name: '우측 주날개', spec: '복합재', sectionIndex: 4, shape: 'box', size: [0.8, 0.05, 1.8], position: [0.15, 0.72, 1.15], rotation: [0, -0.35, 0], material: 'paintWhite' },
    { name: '날개 리브', spec: '×16', sectionIndex: 4, shape: 'box', size: [0.55, 0.04, 0.015], position: [0.15, 0.72, -1.95], material: 'aluminum', repeat: { count: 16, mode: 'line', step: [0, 0, 0.26] } },
    { name: '플랩', spec: '×2', sectionIndex: 4, shape: 'box', size: [0.15, 0.03, 1.3], position: [-0.35, 0.71, -1.0], material: 'aluminum', repeat: { count: 2, mode: 'line', step: [0, 0, 2.0] } },
    { name: '메인 기어', spec: '휠 ×4', sectionIndex: 4, shape: 'cylinder', size: [0.07, 0.07, 0.05], position: [0.1, 0.3, -0.3], rotation: [Math.PI / 2, 0, 0], material: 'rubber', repeat: { count: 4, mode: 'grid', columns: 2, step: [0.18, 0, 0], rowStep: [0, 0.6, 0] } },
    { name: '좌측 나셀', spec: 'CFRP', sectionIndex: 5, shape: 'cylinder', size: [0.16, 0.14, 0.5], position: [0.4, 0.55, -0.85], rotation: ALONG_X, material: 'paintWhite' },
    { name: '우측 나셀', spec: 'CFRP', sectionIndex: 5, shape: 'cylinder', size: [0.16, 0.14, 0.5], position: [0.4, 0.55, 0.85], rotation: ALONG_X, material: 'paintWhite' },
    { name: '좌측 팬 블레이드', spec: 'Ti ×18', sectionIndex: 5, shape: 'box', size: [0.012, 0.12, 0.035], position: [0.66, 0.55, -0.85], material: 'steel', repeat: { count: 18, mode: 'ring', radius: 0.075, axis: 'x' } },
    { name: '우측 팬 블레이드', spec: 'Ti ×18', sectionIndex: 5, shape: 'box', size: [0.012, 0.12, 0.035], position: [0.66, 0.55, 0.85], material: 'steel', repeat: { count: 18, mode: 'ring', radius: 0.075, axis: 'x' } },
    { name: '압축기', spec: '10단', sectionIndex: 6, shape: 'cylinder', size: [0.08, 0.06, 0.24], position: [0.36, 0.55, -0.85], rotation: ALONG_X, material: 'steel', repeat: { count: 2, mode: 'line', step: [0, 0, 1.7] } },
    { name: '연소실', spec: '환형', sectionIndex: 6, shape: 'torus', size: [0.055, 0.02], position: [0.2, 0.55, -0.85], rotation: RING_X, material: 'copper', repeat: { count: 2, mode: 'line', step: [-1.7, 0, 0] } },
    { name: '터빈', spec: '고압 2단', sectionIndex: 6, shape: 'cone', size: [0.06, 0.18], position: [0.08, 0.55, -0.85], rotation: [0, 0, Math.PI / 2], material: 'darkSteel', repeat: { count: 2, mode: 'line', step: [0, 0, 1.7] } },
    { name: '수직 안정판', spec: '복합재', sectionIndex: 7, shape: 'box', size: [0.55, 0.7, 0.04], position: [-1.55, 1.42, 0], rotation: [0, 0, 0.35], material: 'paintWhite' },
    { name: '방향타', spec: '복합재', sectionIndex: 7, shape: 'box', size: [0.14, 0.55, 0.03], position: [-1.85, 1.4, 0], rotation: [0, 0, 0.35], material: 'paintOrange' },
    { name: '수평 안정판', spec: '×2', sectionIndex: 7, shape: 'box', size: [0.4, 0.03, 0.7], position: [-1.5, 0.98, -0.42], rotation: [0, 0.3, 0], material: 'paintWhite', repeat: { count: 2, mode: 'line', step: [0, 0, 0.84] } },
  ],
  exteriorList: [
    { name: '기수·레이돔', anchor: [2.35, 0.95, 0] }, { name: '조종석 창', anchor: [1.86, 1.12, 0] }, { name: '동체 외피', anchor: [0.4, 1.24, 0] },
    { name: '주날개', anchor: [0.2, 0.74, -1.9] }, { name: '엔진 나셀', anchor: [0.45, 0.4, 0.85] }, { name: '꼬리날개', anchor: [-1.6, 1.75, 0] },
  ],
};
