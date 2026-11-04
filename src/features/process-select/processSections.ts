import type { SelectionKind } from '@/features/education-select/selectionProducts';

export type ProcessStatus = 'DONE' | 'NOW' | 'NEXT';
export interface ProcessSection { name: string; status: ProcessStatus; color: string; summary: string; parts: string; }
type SectionRow = [string, ProcessStatus, string, string, string];

/** Demo 1.dc.html seqGo()의 G4/SETS 원문. 실습 데이터는 변경하지 않습니다. */
const SECTION_ROWS: Record<SelectionKind, SectionRow[]> = {
  pump: [
    ['베이스 · 모터 하우징', 'DONE', '#3fe0c5', '베이스 판 · 냉각핀 하우징', '베이스 판, 모터 하우징, 고정 볼트 4개'],
    ['모터 내부 조립', 'DONE', '#3fe0c5', '고정자 코일 · 회전자 · 베어링', '고정자 코일, 회전자 축, 베어링 2개'],
    ['펌프부 조립', 'NOW', '#f37321', '기어 · 펌프 바디 · 커플링', '구동 기어, 종동 기어, 펌프 바디, 커플링'],
    ['밸브 블록 · 캡', 'NEXT', '#b4bcc0', '밸브 · 상부 캡 · 포트', '밸브 블록, 릴리프 밸브, 상부 캡, 포트 피팅'],
  ],
  car: [
    ['하부 · 바퀴', 'NOW', '#f37321', '차대 · 바퀴 4개 · 휠', '차대, 타이어 4개, 휠 4개'],
    ['차체', 'NEXT', '#b4bcc0', '차체 · 전조등', '차체 패널, 전조등 2개'],
    ['캐빈 · 루프', 'NEXT', '#b4bcc0', '유리 · 루프 패널', '캐빈 유리, 루프 패널'],
  ],
  drone: [
    ['랜딩 기어', 'NOW', '#f37321', '다리 · 스키드', '랜딩 다리 2개, 스키드 2개'],
    ['본체', 'NEXT', '#b4bcc0', '셸 · 카메라', '본체 셸, 카메라 모듈'],
    ['암 · 모터 · 프로펠러', 'NEXT', '#b4bcc0', '암 4개 · 모터 4개', '암 4개, 모터 4개, 프로펠러 4개'],
  ],
  stool: [
    ['다리 프레임', 'NOW', '#f37321', '측면 다리 · 가로대', '측면 다리 4개, 가로대 2개'],
    ['발판 · 연결대', 'NEXT', '#b4bcc0', '아래 발판 · 금속 연결대', '아래 발판, 금속 연결대, 볼트'],
    ['윗판', 'NEXT', '#b4bcc0', '윗판 · 손잡이 구멍', '윗판, 나사 3개'],
  ],
};
export function getProcessSections(kind: SelectionKind): ProcessSection[] {
  return SECTION_ROWS[kind].map(([name, status, color, summary, parts]) => ({ name, status, color, summary, parts }));
}
export const PROCESS_NAMES: Record<SelectionKind, string> = { pump: '유압 펌프', car: '차량', drone: '드론', stool: '스텝 스툴' };
