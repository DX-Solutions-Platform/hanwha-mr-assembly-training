import styled, { keyframes } from 'styled-components';
import { cutCorner, monoLabel } from '@/styles/mixins';
import { INTRO_ENTER_MS, INTRO_EXIT_MS, type IntroNavigationState } from './introNavigation';

const enterSlide = keyframes`from { opacity: 0; transform: translate3d(var(--intro-enter-x), 0, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); }`;

export const Root = styled.main`
  position: fixed; inset: 0; overflow-x: hidden; overflow-y: auto; color: ${({ theme }) => theme.color.ink};
  background: radial-gradient(ellipse at 80% 40%, ${({ theme }) => theme.color.primaryFill}, transparent 65%), ${({ theme }) => theme.color.bgEdge};
  button:focus-visible, a:focus-visible { outline: 2px solid ${({ theme }) => theme.color.primarySoft}; outline-offset: 4px; }
`;
export const Shell = styled.div`
  width: 100%; min-width: 0; max-width: ${({ theme }) => theme.stage.width}px; height: 100dvh; min-height: ${({ theme }) => theme.space[8] * 10}px; margin: auto;
  display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr) auto; gap: ${({ theme }) => theme.space[6]}px;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[8]}px;
  @media (max-width: 1100px) { padding: ${({ theme }) => theme.space[5]}px; gap: ${({ theme }) => theme.space[5]}px; }
  @media (max-height: 900px) { padding: ${({ theme }) => theme.space[5]}px; gap: ${({ theme }) => theme.space[4]}px; }
`;
export const Header = styled.header`
  display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: ${({ theme }) => theme.space[5]}px;
  padding-bottom: ${({ theme }) => theme.space[5]}px; border-bottom: 1px solid ${({ theme }) => theme.color.primaryLineWeak};
  @media (max-height: 900px) { padding-bottom: ${({ theme }) => theme.space[4]}px; }
`;
export const Brand = styled.div`
  ${monoLabel}; min-width: 0; white-space: normal; overflow-wrap: anywhere; font-size: ${({ theme }) => theme.size.base}px; color: ${({ theme }) => theme.color.primary};
  span { color: ${({ theme }) => theme.color.inkSub}; font-size: ${({ theme }) => theme.size.sm}px; }
  @media (max-width: 1100px) { span { display: block; margin-top: ${({ theme }) => theme.space[2]}px; font-size: ${({ theme }) => theme.size.xs}px; } }
`;
export const Skip = styled.button`
  display: flex; align-items: center; gap: ${({ theme }) => theme.space[4]}px; white-space: nowrap;
  padding: ${({ theme }) => theme.space[4]}px; border: 1px solid ${({ theme }) => theme.color.primaryLine};
  color: ${({ theme }) => theme.color.ink}; font-size: ${({ theme }) => theme.size.base}px;
  kbd { font: ${({ theme }) => theme.weight.medium} ${({ theme }) => theme.size.sm}px ${({ theme }) => theme.font.mono}; color: ${({ theme }) => theme.color.primarySoft}; }
  &:hover { color: ${({ theme }) => theme.color.primarySoft}; background: ${({ theme }) => theme.color.primaryFill}; }
`;
export const Main = styled.div<{ $phase: IntroNavigationState['phase']; $direction: number }>`
  --intro-enter-x: ${({ $direction }) => $direction * 28}px;
  opacity: ${({ $phase }) => $phase === 'leaving' ? 0 : 1};
  transform: translate3d(${({ $phase, $direction }) => $phase === 'leaving' ? -$direction * 24 : 0}px, 0, 0);
  transition: opacity ${INTRO_EXIT_MS}ms ease, transform ${INTRO_EXIT_MS}ms ease;
  animation-name: ${({ $phase }) => $phase === 'entering' ? enterSlide : 'none'};
  animation-duration: ${INTRO_ENTER_MS}ms; animation-timing-function: ${({ theme }) => theme.motion.ease}; animation-fill-mode: both;
  min-width: 0; min-height: 0; overflow-x: hidden; overflow-y: auto; display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  align-items: safe center; gap: ${({ theme }) => theme.space[7]}px;
  @media (max-width: 1100px) { gap: ${({ theme }) => theme.space[5]}px; grid-template-columns: minmax(0, 1.2fr) minmax(220px, .85fr); }
  @media (max-width: 700px) { grid-template-columns: 1fr; & > figure { width: 60%; justify-self: center; } }
  @media (prefers-reduced-motion: reduce) { animation: none; transition: none; transform: none; }
`;
export const Copy = styled.section`
  min-width: 0; overflow-wrap: anywhere; padding-block: ${({ theme }) => theme.space[4]}px;
`;
export const Eyebrow = styled.div`
  ${monoLabel}; display: flex; align-items: center; flex-wrap: wrap; gap: ${({ theme }) => theme.space[5]}px;
  font-size: ${({ theme }) => theme.size.md}px; color: ${({ theme }) => theme.color.ink};
  span { padding: ${({ theme }) => theme.space[2]}px ${({ theme }) => theme.space[3]}px; background: ${({ theme }) => theme.color.primary}; color: ${({ theme }) => theme.color.onPrimary}; font-family: ${({ theme }) => theme.font.main}; font-weight: ${({ theme }) => theme.weight.bold}; letter-spacing: 0; }
  b { font-weight: ${({ theme }) => theme.weight.medium}; }
`;
export const Code = styled.p`
  ${monoLabel}; margin: ${({ theme }) => theme.space[6]}px 0 ${({ theme }) => theme.space[4]}px;
  color: ${({ theme }) => theme.color.primarySoft}; font-size: ${({ theme }) => theme.size.sm}px; white-space: normal; line-height: 1.6;
  @media (max-height: 900px) { margin: ${({ theme }) => theme.space[4]}px 0 ${({ theme }) => theme.space[2]}px; }
`;
export const Title = styled.h1`
  margin: 0; white-space: pre-line; font-size: ${({ theme }) => theme.size.display + theme.space[3]}px;
  line-height: 1.28; letter-spacing: -.035em; font-weight: ${({ theme }) => theme.weight.bold}; color: ${({ theme }) => theme.color.ink};
  &:focus { outline: none; }
  @media (max-width: 1100px) { font-size: ${({ theme }) => theme.size.xxl + theme.space[1]}px; }
  @media (max-height: 900px) and (min-width: 1101px) { font-size: ${({ theme }) => theme.size.display}px; }
`;
export const Description = styled.p`
  margin: ${({ theme }) => theme.space[5]}px 0; max-width: 30em; font-size: ${({ theme }) => theme.size.xl}px;
  line-height: 1.75; color: ${({ theme }) => theme.color.ink}; text-wrap: pretty; word-break: keep-all;
  @media (max-width: 1100px) { font-size: ${({ theme }) => theme.size.lg}px; }
  @media (max-height: 900px) { font-size: ${({ theme }) => theme.size.lg}px; line-height: 1.6; margin-block: ${({ theme }) => theme.space[4]}px; }
`;
export const Details = styled.ol`
  display: flex; flex-direction: column; gap: ${({ theme }) => theme.space[4]}px; margin: ${({ theme }) => theme.space[6]}px 0 0; padding: 0; list-style: none;
  li { display: flex; align-items: baseline; gap: ${({ theme }) => theme.space[4]}px; font-size: ${({ theme }) => theme.size.lg}px; line-height: 1.7; color: ${({ theme }) => theme.color.inkSub}; word-break: keep-all; }
  span { flex: none; font: ${({ theme }) => theme.weight.medium} ${({ theme }) => theme.size.sm}px ${({ theme }) => theme.font.mono}; color: ${({ theme }) => theme.color.primary}; }
  @media (max-width: 1100px) { li { font-size: ${({ theme }) => theme.size.base}px; } }
  @media (max-height: 900px) { margin-top: ${({ theme }) => theme.space[4]}px; gap: ${({ theme }) => theme.space[2]}px; li { font-size: ${({ theme }) => theme.size.base}px; line-height: 1.6; } }
`;
export const Footer = styled.footer`border-top: 1px solid ${({ theme }) => theme.color.primaryLineWeak}; padding-top: ${({ theme }) => theme.space[5]}px;`;
export const Navigation = styled.div`display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: ${({ theme }) => theme.space[4]}px;`;
export const KeyboardHint = styled.span`
  display: flex; align-items: center; gap: ${({ theme }) => theme.space[3]}px;
  font-size: ${({ theme }) => theme.size.base}px; color: ${({ theme }) => theme.color.inkSub};
  kbd { display: inline-grid; place-items: center; min-width: ${({ theme }) => theme.space[6]}px; height: ${({ theme }) => theme.space[6]}px; padding-inline: ${({ theme }) => theme.space[2]}px; border: 1px solid ${({ theme }) => theme.color.primaryLine}; font: ${({ theme }) => theme.weight.medium} ${({ theme }) => theme.size.sm}px ${({ theme }) => theme.font.mono}; color: ${({ theme }) => theme.color.primarySoft}; }
  @media (max-width: 800px) { font-size: ${({ theme }) => theme.size.md}px; }
`;
export const Actions = styled.div`display: flex; align-items: center; gap: ${({ theme }) => theme.space[4]}px; margin-left: auto;`;
export const Previous = styled.button`
  display: inline-grid; place-items: center; text-decoration: none; color: ${({ theme }) => theme.color.ink};
  min-width: ${({ theme }) => theme.space[7]}px; height: ${({ theme }) => theme.space[8]}px;
  border: 1px solid ${({ theme }) => theme.color.primaryLine}; font-size: ${({ theme }) => theme.size.xl}px;
  &[aria-disabled='true'] { opacity: .25; cursor: default; pointer-events: none; }
  &:hover:not([aria-disabled='true']) { background: ${({ theme }) => theme.color.primaryFill}; }
`;
export const Next = styled.button`
  display: flex; justify-content: space-between; align-items: center; gap: ${({ theme }) => theme.space[6]}px;
  min-height: ${({ theme }) => theme.space[8]}px; padding: 0 ${({ theme }) => theme.space[6]}px; text-decoration: none;
  background: ${({ theme }) => theme.color.primary}; color: ${({ theme }) => theme.color.onPrimary};
  font-size: ${({ theme }) => theme.size.lg}px; font-weight: ${({ theme }) => theme.weight.bold}; ${({ theme }) => cutCorner(theme.cut.md)};
  kbd { font: ${({ theme }) => theme.weight.medium} ${({ theme }) => theme.size.sm}px ${({ theme }) => theme.font.mono}; }
  &:hover { filter: brightness(1.1); color: ${({ theme }) => theme.color.onPrimary}; }
  &:focus-visible { box-shadow: inset 0 0 0 3px ${({ theme }) => theme.color.ink}; }
`;
