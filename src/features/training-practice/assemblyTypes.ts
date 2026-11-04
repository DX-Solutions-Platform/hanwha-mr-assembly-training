export type BoltStage = 'place' | 'tool' | 'turn';
export interface AssemblyState {
  section: number; step: number; boltN: number; boltStage: BoltStage;
  restTool: number | null; toolSafe: boolean; toolSafetyOpen: boolean; radialOpen: boolean; radialHover: number | null;
}
export const initialAssembly = (section: number): AssemblyState => ({ section, step: 0, boltN: 0, boltStage: 'place', restTool: null, toolSafe: false, toolSafetyOpen: false, radialOpen: false, radialHover: null });
export interface AssemblyReport { time: string; mistakes: number; hints: number; torque: string; bolts: string; grade: string; mode: string; at: string; }
export interface AssemblyFrame {
  gaugeVisible: boolean; torque: number; resistance: number;
  turnVisible: boolean; turnX: number; turnY: number; turnOpacity: number; turnRotation: number; dotX: number; dotY: number;
  holding: number; restShake: number;
}
export interface AssemblyFeedback { kind: 'error' | 'toast' | 'section'; tag: string; message: string; }
export const ASSEMBLY_TOOLS = [
  { code: 'T1', name: '토크 렌치', spec: '12 N·m', desc: '설정 토크에 도달하면 클릭음으로 알려 토크 초과를 막습니다.' },
  { code: 'T2', name: '육각 렌치', spec: '5 mm', desc: '육각 홈 볼트를 풀고 조입니다.' },
  { code: 'T3', name: '드라이버', spec: '+2', desc: '배선 단자 나사를 조입니다.' },
  { code: 'T4', name: '롱노즈', spec: '150 mm', desc: '좁은 곳의 배선을 잡거나 구부립니다.' },
  { code: 'T5', name: '고무 망치', spec: '0.5 kg', desc: '베어링을 손상 없이 압입합니다.', modelUrl: '/models/hammer.glb' },
  { code: 'T6', name: '압력 게이지', spec: '0–250 bar', desc: '조립 후 유압을 측정합니다.' },
] as const;
