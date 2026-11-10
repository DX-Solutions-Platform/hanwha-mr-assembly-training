import type { CSSProperties } from 'react';
import { keyframes } from 'styled-components';
import type { IntroVisual } from './introSteps';

export const SPRITE_POSITION: Record<IntroVisual, string> = {
  flow: '0% 0%', product: '50% 0%', safety: '100% 0%', tools: '0% 100%', report: '50% 100%', upload: '100% 100%',
};

function part(id: string, clip: string, origin: string, seed: number, restY = 0) {
  return { id, clip, origin, restY, duration: 4.8 + seed * .43, delay: -seed * .77, rise: 8 + seed % 3 * 4, tilt: seed % 2 ? 2 : -2 };
}

export const floatIntroObject = keyframes`
  0%, 100% { transform: translate3d(0, var(--intro-rest-y), 0) rotate(var(--intro-tilt-start)); }
  50% { transform: translate3d(0, var(--intro-rise-y), 0) rotate(var(--intro-tilt-end)); }
`;

export function introObjectStyle(objectPart: ReturnType<typeof part>) {
  const { clip, origin, duration, delay, restY, rise, tilt } = objectPart;
  return {
    clipPath: clip, transformOrigin: origin, animationDuration: `${duration}s`, animationDelay: `${delay}s`,
    '--intro-rest-y': `${restY}px`, '--intro-rise-y': `${restY - rise}px`,
    '--intro-tilt-start': `${-tilt}deg`, '--intro-tilt-end': `${tilt}deg`,
  } as CSSProperties;
}

// Boundaries follow the upper and lower edges of the orange spacer in the STEP card image.
const spacerTop = [
  '0 49%', '30.2% 49%', '31.3% 46.9%', '33.9% 44.8%', '35.8% 43.6%', '40.4% 45.4%', '45.6% 47.4%',
  '50.8% 47.9%', '56% 46.7%', '61.2% 44.5%', '63.8% 44%', '67.1% 45.8%', '69% 49%', '100% 49%',
];
const spacerBottom = [
  '0 69%', '30.2% 69.5%', '31.3% 71.2%', '33.9% 73.2%', '37.8% 74.9%', '43% 75.9%', '49% 76.2%',
  '54% 76.1%', '58.6% 75.4%', '63.8% 73.7%', '67.1% 71.9%', '68.4% 70.4%', '70% 69%', '100% 69%',
];
const leftBoltFoot = ['25.5% 26.8%', '26% 28%', '27% 28.5%', '29.5% 28.5%', '30.7% 27.7%', '31% 26%'];
const rightBoltFoot = ['69% 26%', '69.3% 27.7%', '70.5% 28.5%', '73% 28.5%', '74% 28%', '74.5% 26.8%'];
const polygon = (points: string[]) => `polygon(${points.join(',')})`;

export const STEP_ARTWORK_PARTS = [
  part('rear-left-bolt', 'inset(0 57% 80% 31%)', '37% 11%', 1),
  part('rear-right-bolt', 'inset(0 31% 80% 57%)', '63% 11%', 3),
  part('front-left-bolt', polygon(['22% 9%', '33% 9%', '33% 23%', ...leftBoltFoot.toReversed(), '22% 26.8%']), '28% 20%', 5),
  part('front-right-bolt', polygon(['67% 9%', '78% 9%', '78% 26.8%', ...rightBoltFoot.toReversed(), '67% 23%']), '72% 20%', 4),
  part('upper-plate', polygon(['0 29%', ...leftBoltFoot, '44% 18.6%', '56% 18.6%', ...rightBoltFoot, '100% 29%', ...spacerTop.toReversed()]), '50% 33%', 0),
  part('orange-spacer', polygon([...spacerTop, ...spacerBottom.toReversed()]), '50% 60%', 2),
  part('lower-plate', polygon([...spacerBottom, '100% 100%', '0 100%']), '50% 86%', 6, 4),
];

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
