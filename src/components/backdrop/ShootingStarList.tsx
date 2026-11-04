'use client';
import styled, { keyframes } from 'styled-components';

const CYCLE_SEC = 20;
const fall = keyframes`
  0% { transform: translate(0, 0) rotate(-32deg); opacity: 0; }
  2% { opacity: 1; }
  7% { transform: translate(-520px, 330px) rotate(-32deg); opacity: 0; }
  100% { transform: translate(-520px, 330px) rotate(-32deg); opacity: 0; }
`;
const SHOOTING_STAR_LIST = [{ x: 1500, y: 60, delaySec: 9 }, { x: 1180, y: 20, delaySec: 13 }, { x: 1780, y: 160, delaySec: 17 }];

/** 별똥별 3개 — 오른쪽 위에서 왼쪽 아래로 */
export function ShootingStarList() {
  return <>{SHOOTING_STAR_LIST.map((star) => <Streak key={star.delaySec} style={{ left: star.x, top: star.y, animationDelay: `${star.delaySec}s` }} />)}</>;
}

const Streak = styled.span`
  position: absolute; width: 160px; height: 1.5px; opacity: 0; transform-origin: 100% 50%;
  background: linear-gradient(90deg, transparent, rgba(255,226,200,.95));
  animation: ${fall} ${CYCLE_SEC}s linear infinite;
`;
