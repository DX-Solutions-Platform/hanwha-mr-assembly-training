import Link from 'next/link';
import styled from 'styled-components';
import { monoLabel } from '@/styles/mixins';
import { floatIntroObject } from './introObjects';

export const Root = styled.main`
  position: fixed; inset: 0; display: flex; overflow: auto;
  padding: clamp(16px, 4vw, ${({ theme }) => theme.space[8]}px);
  background: ${({ theme }) => theme.color.bgEdge};
  color: ${({ theme }) => theme.color.ink};
`;

export const Shell = styled.div`
  display: grid; width: 100%; min-width: 0; margin: auto;
  max-width: ${({ theme }) => theme.stage.width * 0.68}px;
  gap: clamp(16px, 2.8dvh, ${({ theme }) => theme.space[5]}px);
`;

export const Header = styled.header`
  display: flex; align-items: flex-end; justify-content: space-between; gap: ${({ theme }) => theme.space[4]}px;
  padding-bottom: ${({ theme }) => theme.space[4]}px; border-bottom: 1px solid ${({ theme }) => theme.color.primaryLineWeak};
`;

export const Brand = styled.p`
  ${monoLabel}; margin: 0 0 ${({ theme }) => theme.space[3]}px;
  font-size: ${({ theme }) => theme.size.xs}px; color: ${({ theme }) => theme.color.primary};
  white-space: normal; line-height: 1.6;
  span { color: ${({ theme }) => theme.color.inkMuted}; }
`;

export const Title = styled.h1`
  margin: 0; font-size: clamp(24px, 3.25vw, ${({ theme }) => theme.size.display}px); line-height: 1.15;
`;

export const HeaderNote = styled.span`
  ${monoLabel}; font-size: ${({ theme }) => theme.size.xs}px; color: ${({ theme }) => theme.color.inkDisabled};
  @media (max-width: 720px) { display: none; }
`;

export const Cards = styled.nav`
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(10px, 1.6vw, ${({ theme }) => theme.space[5]}px);
  min-height: clamp(350px, 55dvh, 480px);
  @media (max-width: 720px) {
    min-height: clamp(310px, 49dvh, 420px);
    grid-template-columns: repeat(3, minmax(204px, 1fr));
    overflow-x: auto; scroll-snap-type: x proximity;
    scrollbar-width: thin; scrollbar-color: ${({ theme }) => theme.color.primaryLine} transparent;
    padding-bottom: ${({ theme }) => theme.space[2]}px;
  }
`;

export const Card = styled(Link)`
  --cut: ${({ theme }) => theme.cut.lg}px;
  --frame-shape: polygon(0 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%);
  --card-border: ${({ theme }) => theme.color.primaryLine};
  --card-face: ${({ theme }) => theme.color.bgMid};
  display: flex; flex-direction: column; min-width: 0; color: ${({ theme }) => theme.color.ink};
  &:hover { color: ${({ theme }) => theme.color.ink}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.primarySoft}; outline-offset: 4px; }
  &[data-highlighted='true'] {
    --card-border: ${({ theme }) => theme.color.primary};
    --card-face: ${({ theme }) => theme.color.bgCenter};
  }
  &:first-child {
    --frame-shape: polygon(0 0, 100% 2%, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 98%, 0 100%);
  }
  &:last-child {
    --frame-shape: polygon(0 2%, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 98%);
  }
  @media (max-width: 720px) {
    scroll-snap-align: center;
    &:focus-visible { outline-offset: -2px; }
    &:first-child, &:last-child {
      --frame-shape: polygon(0 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%);
    }
  }
`;

export const CardLabel = styled.span`
  ${monoLabel}; display: flex; align-items: baseline; gap: ${({ theme }) => theme.space[3]}px;
  padding: 0 ${({ theme }) => theme.space[1]}px ${({ theme }) => theme.space[3]}px;
  font-size: ${({ theme }) => theme.size.xs}px; color: ${({ theme }) => theme.color.inkDisabled};
  b { font-size: ${({ theme }) => theme.size.md}px; color: ${({ theme }) => theme.color.primarySoft}; }
  [data-highlighted='true'] & { color: ${({ theme }) => theme.color.primarySoft}; }
`;

export const Frame = styled.div`
  display: grid; flex: 1; min-height: 0; padding: 1px; background: var(--card-border);
  clip-path: var(--frame-shape);
`;

export const Surface = styled.div`
  position: relative; isolation: isolate; display: grid; grid-template-rows: minmax(0, 1fr) auto;
  min-width: 0; min-height: 0; overflow: hidden; clip-path: var(--frame-shape); background: var(--card-face);
  &::after {
    content: ''; position: absolute; inset: 0 0 0 auto; width: ${({ theme }) => theme.space[1]}px;
    background: ${({ theme }) => theme.color.primary}; opacity: 0; pointer-events: none;
  }
  [data-highlighted='true'] &::after { opacity: 1; }
`;

export const Visual = styled.div`
  position: relative; min-height: 0; isolation: isolate; overflow: hidden; container-type: size;
  display: grid; place-items: center;
  &::before {
    content: ''; position: absolute; inset: 0; z-index: -1;
    background-image: linear-gradient(to right, ${({ theme }) => theme.color.primaryLineWeak} 1px, transparent 1px),
      linear-gradient(to bottom, ${({ theme }) => theme.color.primaryLineWeak} 1px, transparent 1px);
    background-size: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[6]}px;
    background-position: center;
    mask-image: radial-gradient(ellipse, #000, transparent 75%);
  }
  &::after {
    content: ''; position: absolute; inset: 12% 13%; z-index: -1; border: 1px solid ${({ theme }) => theme.color.primaryLineWeak};
    clip-path: polygon(0 0, 19% 0, 19% 2%, 2% 2%, 2% 19%, 0 19%, 0 0,
      100% 0, 100% 19%, 98% 19%, 98% 2%, 81% 2%, 81% 0, 100% 0,
      100% 100%, 81% 100%, 81% 98%, 98% 98%, 98% 81%, 100% 81%, 100% 100%,
      0 100%, 0 81%, 2% 81%, 2% 98%, 19% 98%, 19% 100%, 0 100%);
  }
`;

export const Artwork = styled.span`
  position: absolute; inset: 0; margin: auto;
  width: min(84%, 86cqh, 306px); aspect-ratio: 1; pointer-events: none;
  filter: brightness(.62) saturate(.65); transform: scale(.93);
  transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    filter ${({ theme }) => theme.motion.base} ease;
  [data-highlighted='true'] & { filter: brightness(1.04) saturate(1.12); transform: scale(1.03); }
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export const ArtworkPart = styled.span<{ $position?: string }>`
  position: absolute; inset: 0;
  background: ${({ $position }) => $position
    ? "url('/intro/tutorial-objects-v2.png') " + $position + " / 300% 200% no-repeat"
    : "url('/intro/start-step-assembly.webp') center / contain no-repeat"};
  animation: ${floatIntroObject} 6s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const CardCopy = styled.div`
  display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end;
  min-height: ${({ theme }) => theme.space[8] * 2}px; gap: ${({ theme }) => theme.space[3]}px;
  padding: clamp(12px, 1.4vw, ${({ theme }) => theme.space[5]}px);
  border-top: 1px solid ${({ theme }) => theme.color.primaryLineWeak};
  background: ${({ theme }) => theme.color.bgMid};
`;

export const CardTitle = styled.h2`
  margin: 0; font-size: clamp(17px, 1.8vw, ${({ theme }) => theme.size.xl}px); line-height: 1.25;
`;

export const Description = styled.p`
  margin: ${({ theme }) => theme.space[2]}px 0 0; color: ${({ theme }) => theme.color.inkMuted};
  font-size: ${({ theme }) => theme.size.sm}px; line-height: 1.55; word-break: keep-all;
`;

export const Arrow = styled.span`
  align-self: center; display: grid; place-items: center; width: clamp(28px, 3vw, ${({ theme }) => theme.space[7]}px); aspect-ratio: 1;
  border: 1px solid ${({ theme }) => theme.color.primaryLineWeak}; color: ${({ theme }) => theme.color.primarySoft};
  font-size: ${({ theme }) => theme.size.lg}px; margin-right: ${({ theme }) => theme.space[2]}px;
  [data-highlighted='true'] & { background: ${({ theme }) => theme.color.primary}; color: ${({ theme }) => theme.color.onPrimary}; }
`;

export const Footer = styled.footer`
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]}px; padding-top: ${({ theme }) => theme.space[3]}px;
  border-top: 1px solid ${({ theme }) => theme.color.primaryLineWeak};
`;

export const Utility = styled.nav`
  display: flex; flex-wrap: wrap; align-items: center; gap: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[5]}px;
  a, button { color: ${({ theme }) => theme.color.inkMuted}; font-size: ${({ theme }) => theme.size.sm}px; }
  a:first-child, a:hover, button:hover { color: ${({ theme }) => theme.color.primarySoft}; }
  a:focus-visible, button:focus-visible { outline: 2px solid ${({ theme }) => theme.color.primarySoft}; outline-offset: 4px; }
`;

export const Keys = styled.div`
  ${monoLabel}; display: flex; align-items: center; gap: ${({ theme }) => theme.space[2]}px;
  font-size: ${({ theme }) => theme.size.xs}px; color: ${({ theme }) => theme.color.inkDisabled};
  kbd { padding: ${({ theme }) => theme.space[1]}px ${({ theme }) => theme.space[2]}px; border: 1px solid ${({ theme }) => theme.color.primaryLine}; }
  @media (hover: none) and (pointer: coarse) { display: none; }
`;
