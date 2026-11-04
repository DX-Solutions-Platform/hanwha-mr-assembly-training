'use client';
import styled, { css, keyframes } from 'styled-components';
import { CURVED_HORIZON_Y } from './backdropLayout';

const sweep = keyframes`from { mask-position: 100% 0; -webkit-mask-position: 100% 0; } to { mask-position: 0 0; -webkit-mask-position: 0 0; }`;
const EASE = 'cubic-bezier(.2,0,0,1)';

interface PlanetRimProps { isFlat: boolean; isTracking: boolean; hasIntro: boolean; }

/** 지구 테두리. 평평해지면 수평선이 되고 이후 카메라를 따라갑니다 */
export function PlanetRim({ isFlat, isTracking, hasIntro }: PlanetRimProps) {
  return (
    <>
      <Body $isFlat={isFlat} $isTracking={isTracking} />
      <Glow $isFlat={isFlat} $isTracking={isTracking} $hasIntro={hasIntro} />
    </>
  );
}

const shape = css<{ $isFlat: boolean; $isTracking: boolean }>`
  position: absolute; left: ${({ $isFlat }) => ($isFlat ? -200 : -1440)}px; width: ${({ $isFlat }) => ($isFlat ? 2320 : 4800)}px;
  top: ${({ $isFlat }) => ($isFlat ? 'var(--horizon-y)' : `${CURVED_HORIZON_Y}px`)}; height: ${({ $isFlat }) => ($isFlat ? 2400 : 4800)}px;
  border-radius: ${({ $isFlat }) => ($isFlat ? '0' : '50%')};
  transition: ${({ $isTracking }) => ($isTracking ? 'none' : `top 1.2s ${EASE}, left 1.2s ${EASE}, width 1.2s ${EASE}, height 1.2s ${EASE}, border-radius 1.2s ${EASE}`)};
`;
const Body = styled.div<{ $isFlat: boolean; $isTracking: boolean }>`
  ${shape}; background: radial-gradient(circle at 50% 0%, #0d0a09 0%, #050404 30%, #020202 60%);
`;
const Glow = styled.div<{ $isFlat: boolean; $isTracking: boolean; $hasIntro: boolean }>`
  ${shape}; pointer-events: none;
  box-shadow: ${({ $isFlat }) => ($isFlat
    ? '0 -1px 1px rgba(255,214,180,.45)'
    : '0 -1px 2px rgba(255,214,180,.7), 0 -4px 15px rgba(255,160,90,.42), 0 -20px 60px rgba(243,115,33,.26), 0 -70px 150px rgba(243,115,33,.12)')};
  -webkit-mask-image: linear-gradient(270deg, #000 45%, transparent 55%); mask-image: linear-gradient(270deg, #000 45%, transparent 55%);
  -webkit-mask-size: 240% 100%; mask-size: 240% 100%; -webkit-mask-position: 0 0; mask-position: 0 0;
  ${({ $hasIntro }) => $hasIntro && css`animation: ${sweep} 6s cubic-bezier(.45,0,.35,1) .2s both;`}
`;
