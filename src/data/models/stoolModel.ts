import type { ModelSpec } from '@/types/model';

/** 스텝 스툴 — 도면 업데이트로 만든 교육 (카드 1장) */
export const STOOL_MODEL: ModelSpec = {
  id: 'step-stool', explodeMode: 'radial', explodeScale: 0.4, viewDistance: 0.9,
  sectionList: [
    { code: '01', name: '측면 프레임 A', summary: '다리 ×2 · 가로대', cardIndex: 0, explode: [-0.6, 0.1, 0] },
    { code: '02', name: '측면 프레임 B', summary: '다리 ×2 · 가로대 · 연결대', cardIndex: 0, explode: [0.6, 0.1, 0] },
    { code: '03', name: '아래 발판', summary: '발판 · 목심 ×2', cardIndex: 0, explode: [0, -0.1, 0.55] },
    { code: '04', name: '윗판', summary: '윗판 · 나사 ×3', cardIndex: 0, explode: [0, 0.55, 0] },
  ],
  partList: [
    { name: '다리 프레임 A', spec: '자작나무', sectionIndex: 0, shape: 'box', size: [0.035, 0.5, 0.045], position: [-0.2, 0.25, -0.15], material: 'wood', repeat: { count: 2, mode: 'line', step: [0, 0, 0.3] } },
    { name: '가로대 A', spec: '자작나무', sectionIndex: 0, shape: 'box', size: [0.03, 0.06, 0.34], position: [-0.2, 0.45, 0], material: 'woodDark' },
    { name: '다리 프레임 B', spec: '자작나무', sectionIndex: 1, shape: 'box', size: [0.035, 0.5, 0.045], position: [0.2, 0.25, -0.15], material: 'wood', repeat: { count: 2, mode: 'line', step: [0, 0, 0.3] } },
    { name: '가로대 B', spec: '자작나무', sectionIndex: 1, shape: 'box', size: [0.03, 0.06, 0.34], position: [0.2, 0.45, 0], material: 'woodDark' },
    { name: '금속 연결대', spec: '121030', sectionIndex: 1, shape: 'box', size: [0.4, 0.04, 0.02], position: [0, 0.45, -0.15], material: 'steel' },
    { name: '아래 발판', spec: '자작나무', sectionIndex: 2, shape: 'box', size: [0.4, 0.022, 0.2], position: [0, 0.23, 0.05], material: 'wood' },
    { name: '목심', spec: '101350 ×2', sectionIndex: 2, shape: 'cylinder', size: [0.006, 0.006, 0.04], position: [-0.21, 0.23, 0.05], rotation: [0, 0, Math.PI / 2], material: 'woodDark', repeat: { count: 2, mode: 'line', step: [0, -0.42, 0] } },
    { name: '윗판', spec: '손잡이 구멍', sectionIndex: 3, shape: 'box', size: [0.43, 0.024, 0.36], position: [0, 0.51, 0], material: 'wood' },
    { name: '윗판 나사', spec: '105111 ×3', sectionIndex: 3, shape: 'cylinder', size: [0.008, 0.008, 0.03], position: [-0.12, 0.53, 0], material: 'steel', repeat: { count: 3, mode: 'line', step: [0.12, 0, 0] } },
  ],
};
