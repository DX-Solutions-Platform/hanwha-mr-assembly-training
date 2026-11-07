'use client';
import styled, { keyframes } from 'styled-components';
import type { CSSProperties } from 'react';
import type { IntroStep } from './introSteps';
import { INTRO_OBJECT_PARTS, SPRITE_POSITION } from './introObjects';

export function IntroPreview({ step, stepIndex }: { step: IntroStep; stepIndex: number }) {
  return (
    <Figure aria-label={`${step.label} 입체 오브젝트`}>
      <Halo aria-hidden="true" />
      <ObjectStage key={step.visual} role="img" aria-label={step.label} data-intro-object={step.visual}>
        {INTRO_OBJECT_PARTS[step.visual].map((part) => <ObjectPart key={part.id} aria-hidden="true" data-intro-part={part.id} $position={SPRITE_POSITION[step.visual]} style={{
          clipPath: part.clip, transformOrigin: part.origin, animationDuration: `${part.duration}s`, animationDelay: `${part.delay}s`,
          '--intro-rest-y': `${part.restY}px`, '--intro-rise-y': `${part.restY - part.rise}px`, '--intro-tilt-start': `${-part.tilt}deg`, '--intro-tilt-end': `${part.tilt}deg`,
        } as CSSProperties} />)}
      </ObjectStage>
      <Shadow aria-hidden="true" />
      <Caption><span>{String(stepIndex + 1).padStart(2, '0')}</span>{step.label}</Caption>
    </Figure>
  );
}

const floating = keyframes`
  0%, 100% { transform: translate3d(0, var(--intro-rest-y), 0) rotate(var(--intro-tilt-start)); }
  50% { transform: translate3d(0, var(--intro-rise-y), 0) rotate(var(--intro-tilt-end)); }
`;
const shadow = keyframes`0%, 100% { transform: scaleX(1); opacity: .55; } 50% { transform: scaleX(.8); opacity: .3; }`;
const Figure = styled.figure`
  position: relative; isolation: isolate; overflow: clip; margin: 0; min-width: 0; width: 100%; align-self: center;
  display: flex; flex-direction: column; align-items: center;
`;
const Halo = styled.div`
  position: absolute; z-index: -1; width: 100%; aspect-ratio: 1; top: 0;
  background: radial-gradient(ellipse, ${({ theme }) => theme.color.primaryFill}, transparent 65%);
`;
const ObjectStage = styled.div`
  position: relative;
  width: 100%; aspect-ratio: 1; max-width: ${({ theme }) => theme.stage.width / 3}px;
  @media (max-height: 900px) { max-width: min(100%, 42dvh); }
`;
const ObjectPart = styled.div<{ $position: string }>`
  position: absolute; inset: 0; pointer-events: none;
  background-image: url('/intro/tutorial-objects-v2.png'); background-repeat: no-repeat;
  background-size: 300% 200%; background-position: ${({ $position }) => $position};
  animation: ${floating} 6s ease-in-out infinite; will-change: transform;
  @media (prefers-reduced-motion: reduce) { animation: none; will-change: auto; }
`;
const Shadow = styled.div`
  width: 70%; height: ${({ theme }) => theme.space[5]}px; margin-top: -${({ theme }) => theme.space[4]}px;
  background: radial-gradient(ellipse, ${({ theme }) => theme.color.primaryLine}, transparent 70%);
  animation: ${shadow} 6s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;
const Caption = styled.figcaption`
  display: flex; align-items: center; gap: ${({ theme }) => theme.space[4]}px;
  margin-top: ${({ theme }) => theme.space[6]}px; color: ${({ theme }) => theme.color.ink};
  font-size: ${({ theme }) => theme.size.lg}px; font-weight: ${({ theme }) => theme.weight.bold};
  span { font-family: ${({ theme }) => theme.font.mono}; font-weight: ${({ theme }) => theme.weight.medium}; color: ${({ theme }) => theme.color.primary}; }
  @media (max-width: 900px) { font-size: ${({ theme }) => theme.size.base}px; }
`;
