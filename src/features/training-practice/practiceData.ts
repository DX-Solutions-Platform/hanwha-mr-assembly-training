import { BOM } from '@/features/training-preparation/bomData';
import type { BoltStage } from './assemblyTypes';
export interface PartInfo { tag: string; name: string; desc: string; }
/** Demo 1 HUD.dc.html 원문. */
export const PRACTICE_SECTIONS = [
    { name: '상부', steps: ['모터 고정', '상단 커버 장착', '볼트 체결', '배선 확인'] },
    { name: '중부', steps: ['베어링 하우징 장착', '구동축 삽입', '고정 링 체결'] },
    { name: '하부', steps: ['본체 배치', '베이스 고정', '배관 연결'] },
    { name: '최종 결합', steps: ['상부·중부 결합', '중부·하부 결합', '최종 점검'] }
  ] as const;
export const PART_INFO: Record<string, PartInfo> = {
    cover: { tag: 'U-03 · 재료', name: '모터 상단 커버', desc: '모터 상부를 덮어 냉각 팬과 배선을 보호합니다. 잡고 끌어서 모터 위에 올리세요.' },
    motor: { tag: 'U-01 · 재료', name: '구동 모터', desc: '펌프를 회전시키는 전동기입니다. 상부 조립의 기준 부품입니다.' },
    tray: { tag: 'U-04 · 재료', name: 'M6 볼트 ×4', desc: '상단 커버를 모터에 고정합니다. 대각선 순서로 체결합니다.' },
    wrench: { tag: 'T1 · 공구', name: '토크 렌치', desc: '설정 토크 12 N·m에 도달하면 클릭음으로 알려 토크 초과를 막습니다.' },
    coup: { tag: 'U-05 · 재료', name: '커플링', desc: '모터 축과 펌프 구동축을 연결합니다. 중부 조립에서 사용합니다.' },
    'sec:0': { tag: 'SECTION · 상부', name: '상부 공정', desc: '모터, 상단 커버, 볼트, 배선으로 구성됩니다. 가장 먼저 조립합니다.' },
    'sec:1': { tag: 'SECTION · 중부', name: '중부 공정', desc: '베어링 하우징과 구동축으로 상부와 하부를 연결합니다.' },
    'sec:2': { tag: 'SECTION · 하부', name: '하부 공정', desc: '펌프 본체와 베이스입니다. 작동유를 흡입·가압합니다.' }
  };
export const PRACTICE_HELP = [{ k: '좌클릭 드래그', v: '앞뒤 이동 · 좌우 회전' }, { k: '우클릭 드래그', v: '시선 회전' }, { k: '휠클릭 드래그', v: '상하좌우 이동' }, { k: '좌+우클릭 드래그', v: '위아래 · 옆 이동' }, { k: 'Alt + 좌클릭', v: '작업물 중심 회전' }, { k: 'Alt + 우클릭', v: '확대 · 축소' }, { k: 'W A S D · Q E', v: '이동 · 아래/위 (Shift 빠르게)' }, { k: '우클릭 + 휠', v: '이동 속도' }, { k: '휠', v: '앞뒤 이동' }, { k: 'F', v: '시점 초기화' }, { k: '← →', v: '구역 이동' }, { k: '클릭', v: '부품 설명' }, { k: '커버 끌기', v: '모터 위에 결합' }, { k: 'V (누른 채)', v: '공구 패널' }, { k: 'B / Esc', v: '설명 닫기' }] as const;

export function getPartInfo(key: string | null): PartInfo | null {
  if (!key) return null;
  if (key.startsWith('bom:')) { const part = BOM[Number(key.slice(4))]; return part ? { tag: `${part.spec} · ${part.qty}개`, name: part.name, desc: part.desc } : null; }
  return PART_INFO[key] ?? null;
}
export function getPracticeGuide(section: number, step: number, boltN = 0, boltStage: BoltStage = 'place', restTool: number | null = null) {
  if (section > 0) return { tag: '상부 완료', text: '현재 시안은 상부 조립까지 구현되어 있습니다.' };
  if (step === 2) return { tag: `상부 · 03 · 볼트 ${Math.min(4, boltN + 1)} / 4`, text: boltStage === 'place' ? '아래에 떠 있는 고정 볼트를 집어 깜빡이는 구멍에 꽂으세요.' : boltStage === 'tool' ? restTool === 0 ? '거치대의 토크 렌치를 볼트에 대세요.' : '토크 렌치를 가져오세요.' : '볼트 주위를 원을 그리듯 시계 방향으로 드래그해 12 N·m까지 조이세요.' };
  return [
    { tag: '상부 · 01', text: '자재 구역의 구동 모터를 잡아 작업 지그 표시 위치로 옮기세요.' },
    { tag: '상부 · 02', text: '상단 커버를 잡아 모터 위 표시 위치로 끌어다 놓으세요.' },
    { tag: '상부 · 03 · 볼트 1 / 4', text: '아래에 떠 있는 고정 볼트를 집어 깜빡이는 구멍에 꽂으세요.' },
    { tag: '상부 · 04', text: '작업 지그의 모터를 클릭해 상부 조립을 완료하세요.' },
  ][Math.min(step, 3)];
}
