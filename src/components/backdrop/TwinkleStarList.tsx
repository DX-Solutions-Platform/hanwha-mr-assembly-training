'use client';
import styled, { keyframes } from 'styled-components';

const twinkle = keyframes`0%, 100% { opacity: .25; } 50% { opacity: 1; }`;
const TWINKLE_STAR_LIST = Array.from({ length: 14 }, (_, starIndex) => ({
  x: (starIndex * 137) % 1880 + 20, y: (starIndex * 89) % 560 + 30, size: 2 + (starIndex % 3), durationSec: 3 + (starIndex % 4), delaySec: (starIndex * 0.7) % 4,
}));

/** 반짝이는 큰 별 14개 */
export function TwinkleStarList() {
  return <>{TWINKLE_STAR_LIST.map((star, starIndex) => <Star key={starIndex} style={{ left: star.x, top: star.y, width: star.size, height: star.size, animationDuration: `${star.durationSec}s`, animationDelay: `${star.delaySec}s` }} />)}</>;
}

const Star = styled.span`position: absolute; border-radius: 50%; background: #fff4ea; box-shadow: 0 0 6px rgba(255,214,180,.9); animation: ${twinkle} 4s ease-in-out infinite;`;
