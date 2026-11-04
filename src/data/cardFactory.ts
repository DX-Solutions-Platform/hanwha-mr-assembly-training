import type { AssemblyCard, CardStatus } from '@/types/training';

/** 안내 문구 또는 [안내 문구, 도구 id] */
export type GuideItem = string | [guide: string, toolId: string];

/** 조립 카드 생성 — 모든 교육이 같은 형식(단계·도구)을 쓰도록 통일 */
export function createCard(id: string, groupLabel: string, name: string, description: string, minutes: number, guideList: GuideItem[], status: CardStatus = 'idle'): AssemblyCard {
  return {
    id, groupLabel, name, description, minutes, status,
    steps: guideList.map((item, stepIndex) => {
      const [guide, toolId] = typeof item === 'string' ? [item, undefined] : item;
      return { id: `${id}-s${stepIndex + 1}`, guide, toolId };
    }),
  };
}
