'use client';
import { useRef, useSyncExternalStore } from 'react';
import styled from 'styled-components';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';

const SAMPLE_SIZE = 120;
const subscribeToUrl = () => () => {};
const readPerfFlag = () => new URLSearchParams(window.location.search).get('perf') === '1';
const serverPerfFlag = () => false;

/** 실기기(Quest 3) 점검용: 주소 뒤에 ?perf=1 을 붙이면 FPS와 1% 저점 프레임을 표시합니다 */
export function PerfMeter() {
  const isEnabled = useSyncExternalStore(subscribeToUrl, readPerfFlag, serverPerfFlag);
  const textRef = useRef<HTMLSpanElement>(null);
  const frameTimeListRef = useRef<number[]>([]);
  const lastTimeRef = useRef(0);

  useAnimationFrame((time) => {
    const frameTimeList = frameTimeListRef.current;
    if (lastTimeRef.current) frameTimeList.push(time - lastTimeRef.current);
    lastTimeRef.current = time;
    if (frameTimeList.length > SAMPLE_SIZE) frameTimeList.shift();
    if (!textRef.current || frameTimeList.length < 10) return;
    const averageMs = frameTimeList.reduce((sum, value) => sum + value, 0) / frameTimeList.length;
    const worstMs = [...frameTimeList].sort((a, b) => b - a)[Math.floor(frameTimeList.length * 0.01)];
    const fps = Math.round(1000 / averageMs), lowFps = Math.round(1000 / worstMs);
    textRef.current.textContent = `${fps} FPS · 1% ${lowFps}`;
    textRef.current.dataset.perfFrames = String(frameTimeList.length);
  }, isEnabled);

  if (!isEnabled) return null;
  return <Root data-perf-meter><span ref={textRef}>측정 중</span></Root>;
}

const Root = styled.div`
  position: fixed; right: 8px; top: 8px; z-index: 9999; padding: 6px 10px; pointer-events: none;
  background: rgba(0,0,0,.75); color: ${({ theme }) => theme.color.success}; font: 500 12px/1 ${({ theme }) => theme.font.mono};
`;
