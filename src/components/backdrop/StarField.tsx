'use client';
import styled, { keyframes } from 'styled-components';

const TILE_WIDTH = 640;
const drift = keyframes`from { transform: translateX(0); } to { transform: translateX(-${TILE_WIDTH}px); }`;
const DOT_LAYER = [
  [6, 12, 1.2], [18, 44, 1.6], [27, 8, 1.2], [39, 63, 1.2], [47, 22, 1.8], [58, 81, 1.2], [66, 37, 1.4], [74, 5, 1.2], [83, 58, 1.6], [92, 29, 1.2], [12, 90, 1.2], [53, 50, 1.2],
].map(([x, y, size]) => `radial-gradient(${size}px ${size}px at ${x}% ${y}%, rgba(255,240,228,.95) 50%, transparent)`).join(',');

/** 천천히 옆으로 흐르는 별 (타일 반복 · GPU 합성만 사용) */
export function StarField() {
  return <><Layer $durationSec={180} $opacity={0.9} /><Layer $durationSec={320} $opacity={0.55} style={{ top: 120, backgroundSize: `${TILE_WIDTH * 0.7}px 300px` }} /></>;
}

const Layer = styled.div<{ $durationSec: number; $opacity: number }>`
  position: absolute; left: 0; top: 0; width: calc(100% + ${TILE_WIDTH}px); height: 720px; opacity: ${({ $opacity }) => $opacity};
  background-image: ${DOT_LAYER}; background-size: ${TILE_WIDTH}px 420px; will-change: transform;
  animation: ${drift} ${({ $durationSec }) => $durationSec}s linear infinite;
`;
