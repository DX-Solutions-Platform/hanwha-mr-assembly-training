'use client';
import { addCustomProduct } from '@/store/trainingStore';
interface SourceCard { name: string; src: string; min: number; steps: string[]; final?: boolean; }
interface GeneratedTraining { name: string; art: string; cards: { img: string; }[]; }
/** 원본 v2와 기존 Next 목록에 같은 교육을 연결합니다. 서버 저장은 없습니다. */
export function saveGeneratedTraining(data: GeneratedTraining, cards: SourceCard[]) {
  addCustomProduct({
    id: 'custom-stool', code: 'NEW', name: data.name, isLive: true, isCustom: true, structure: 'single', modelId: 'step-stool', parts: [], coverImageUrl: data.art,
    cards: cards.map((card, index) => ({
      id: `stool-${index}`, groupLabel: `STEP STOOL · 도면 ${card.src}`, name: card.name, description: card.steps[0], minutes: card.min,
      status: index === 0 ? 'now' : card.final ? 'final' : 'idle', thumbnailUrl: data.cards[index]?.img,
      steps: card.steps.map((guide, stepIndex) => ({ id: `stool-${index}-${stepIndex}`, guide })),
    })),
  });
}
