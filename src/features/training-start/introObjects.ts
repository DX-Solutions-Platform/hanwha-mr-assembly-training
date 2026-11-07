import type { IntroVisual } from './introSteps';

export const SPRITE_POSITION: Record<IntroVisual, string> = {
  flow: '0% 0%', product: '50% 0%', safety: '100% 0%', tools: '0% 100%', report: '50% 100%', upload: '100% 100%',
};

function part(id: string, clip: string, origin: string, seed: number, restY = 0) {
  return { id, clip, origin, restY, duration: 4.8 + seed * .43, delay: -seed * .77, rise: 8 + seed % 3 * 4, tilt: seed % 2 ? 2 : -2 };
}

/** 투명한 간격을 경계로 자른 각 오브젝트는 자기 중심과 고유한 주기로 움직입니다. */
export const INTRO_OBJECT_PARTS = {
  flow: [
    part('upper-plate', 'polygon(26% 0,77% 0,77% 40%,26% 40%)', '50% 22%', 0, -12),
    part('orange-core', 'polygon(26% 40%,77% 40%,77% 56%,68% 56%,66% 57%,64% 61%,62% 62%,60% 65%,58% 66%,56% 66.7%,54% 67%,50% 67.5%,46% 67%,44% 66%,42% 65%,40% 62%,38% 61%,36% 57%,35% 56%,26% 56%)', '50% 54%', 1),
    part('lower-block', 'polygon(26% 56%,35% 56%,36% 57%,38% 61%,40% 62%,42% 65%,44% 66%,46% 67%,50% 67.5%,54% 67%,56% 66.7%,58% 66%,60% 65%,62% 62%,64% 61%,66% 57%,68% 56%,77% 56%,77% 100%,26% 100%)', '50% 83%', 2, 12),
    part('upper-left-bolt', 'polygon(0 0,26% 0,26% 52%,0 52%)', '20% 38%', 3),
    part('lower-left-bolt', 'polygon(0 52%,26% 52%,26% 100%,0 100%)', '20% 68%', 4),
    part('upper-right-bolt', 'polygon(77% 0,100% 0,100% 52%,77% 52%)', '82% 38%', 5),
    part('lower-right-bolt', 'polygon(77% 52%,100% 52%,100% 100%,77% 100%)', '82% 68%', 6),
  ],
  product: [
    part('pump', 'polygon(25% 0,100% 0,100% 75%,70% 75%,70% 100%,0 100%,0 22%,25% 22%)', '50% 50%', 0),
    part('upper-bolt', 'polygon(0 0,25% 0,25% 22%,0 22%)', '14% 14%', 2),
    part('lower-bolt', 'polygon(70% 75%,100% 75%,100% 100%,70% 100%)', '83% 85%', 4),
  ],
  safety: [
    part('shield', 'polygon(0 0,100% 0,100% 18%,32% 100%,0 100%)', '40% 45%', 0),
    part('gear', 'polygon(100% 18%,100% 100%,32% 100%)', '74% 78%', 3),
  ],
  tools: [
    part('wrench', 'polygon(0 0,100% 0,30% 100%,0 100%)', '44% 45%', 1),
    part('bolt', 'polygon(100% 0,100% 100%,30% 100%)', '78% 74%', 4),
  ],
  report: [part('report-slate', 'inset(0)', '50% 50%', 2)],
  upload: [
    part('drawing-sheets', 'polygon(0 35%,100% 35%,100% 100%,0 100%)', '50% 68%', 0, 10),
    part('upload-arrow', 'polygon(40% 0,100% 0,100% 35%,40% 35%)', '66% 18%', 2, -8),
    part('metal-cube', 'polygon(0 0,40% 0,40% 35%,0 35%)', '16% 18%', 5),
  ],
} satisfies Record<IntroVisual, ReturnType<typeof part>[]>;
