import type { Tool } from '@/types/training';

export const TOOL_LIST: Tool[] = [
  { id: 'torqueWrench', code: 'T1', name: '토크 렌치', spec: '12 N·m', description: '설정 토크에 도달하면 클릭음으로 알려 과체결을 막습니다.' },
  { id: 'hexKey', code: 'T2', name: '육각 렌치', spec: '5 mm', description: '육각 홈 볼트를 조이고 풉니다.' },
  { id: 'screwdriver', code: 'T3', name: '드라이버', spec: '+2', description: '십자 나사 체결용입니다.' },
  { id: 'longNose', code: 'T4', name: '롱노즈', spec: '160 mm', description: '좁은 곳의 배선·핀을 잡습니다.' },
  { id: 'rubberHammer', code: 'T5', name: '고무 망치', spec: '0.5 kg', description: '부품에 흠집 없이 충격을 주어 끼워 맞춥니다.', modelUrl: '/models/hammer.glb' },
  { id: 'pressureGauge', code: 'T6', name: '압력 게이지', spec: '0–250 bar', description: '유압 라인의 압력을 확인합니다.' },
];
