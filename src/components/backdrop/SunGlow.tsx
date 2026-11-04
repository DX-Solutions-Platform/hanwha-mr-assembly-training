'use client';
import styled, { css, keyframes } from 'styled-components';
import { CURVED_HORIZON_Y } from './backdropLayout';

const rise = keyframes`from { opacity: 0; } to { opacity: 1; }`;

/** 지평선 가운데 해. 빛 채움이 가운데 닿을 때(3.4초) 밝아지고, 평평해지면 사라집니다 */
export function SunGlow({ isFlat, hasIntro }: { isFlat: boolean; hasIntro: boolean }) {
  return <Glow $isFlat={isFlat} $hasIntro={hasIntro} />;
}

const Glow = styled.div<{ $isFlat: boolean; $hasIntro: boolean }>`
  position: absolute; left: 760px; top: ${CURVED_HORIZON_Y - 130}px; width: 400px; height: 260px; pointer-events: none; mix-blend-mode: screen;
  background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,236,212,.6) 0%, rgba(255,180,110,.32) 9%, rgba(243,115,33,.15) 28%, transparent 70%);
  ${({ $hasIntro }) => $hasIntro && css`animation: ${rise} 3s ease-out 3.4s both;`}
  ${({ $isFlat }) => $isFlat && css`opacity: 0 !important; animation: none; transition: opacity .7s ease-out;`}
`;
