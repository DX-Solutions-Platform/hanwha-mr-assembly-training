'use client';
import { useEffect, useRef, type RefObject } from 'react';
import styled from 'styled-components';
import type { ScreenPoint } from '@/types/scene';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { theme } from '@/styles/theme';

interface PartLabelItem { name: string; spec: string; }
interface NearCursorPartLabelsProps { partList: PartLabelItem[]; pointListRef: RefObject<ScreenPoint[]>; }

const LABEL_POOL_SIZE = 6;
const NEAR_RADIUS = 420;

/** 부품이 많을 때: 마우스 주변 부품 6개만 이름을 보여 주고 나머지는 점으로 표시 (확정 C) */
export function NearCursorPartLabels({ partList, pointListRef }: NearCursorPartLabelsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef({ x: -9999, y: -9999 });
  const labelRefList = useRef<(HTMLDivElement | null)[]>([]);
  const nameRefList = useRef<(HTMLSpanElement | null)[]>([]);
  const specRefList = useRef<(HTMLSpanElement | null)[]>([]);
  const lineRefList = useRef<(SVGLineElement | null)[]>([]);
  const dotRefList = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const rect = rootRef.current?.getBoundingClientRect(); if (!rect) return;
      cursorRef.current = { x: ((event.clientX - rect.left) / rect.width) * theme.stage.width, y: ((event.clientY - rect.top) / rect.height) * theme.stage.height };
    };
    window.addEventListener('pointermove', handleMove);
    return () => window.removeEventListener('pointermove', handleMove);
  }, []);

  useAnimationFrame(() => {
    const pointList = pointListRef.current ?? [];
    const cursor = cursorRef.current;
    partList.forEach((_, partIndex) => {
      const dot = dotRefList.current[partIndex], point = pointList[partIndex]; if (!dot) return;
      dot.style.opacity = point?.isVisible ? '1' : '0';
      if (point?.isVisible) { dot.setAttribute('cx', String(point.x)); dot.setAttribute('cy', String(point.y)); }
    });
    const nearList = partList.map((_, partIndex) => ({ partIndex, point: pointList[partIndex] }))
      .filter((item) => item.point?.isVisible)
      .map((item) => ({ ...item, distance: Math.hypot(item.point.x - cursor.x, item.point.y - cursor.y) }))
      .filter((item) => item.distance < NEAR_RADIUS).sort((a, b) => a.distance - b.distance).slice(0, LABEL_POOL_SIZE);
    for (let slot = 0; slot < LABEL_POOL_SIZE; slot++) {
      const label = labelRefList.current[slot], line = lineRefList.current[slot], near = nearList[slot];
      const nameElement = nameRefList.current[slot], specElement = specRefList.current[slot];
      if (!label || !line || !nameElement || !specElement) continue;
      label.style.opacity = near ? '1' : '0'; line.style.opacity = near ? '1' : '0';
      if (!near) continue;
      const part = partList[near.partIndex];
      nameElement.textContent = part.name; specElement.textContent = part.spec;
      const side = near.point.x > cursor.x ? 1 : -1;
      const endX = near.point.x + side * 90, endY = near.point.y - 34;
      line.setAttribute('x1', String(near.point.x)); line.setAttribute('y1', String(near.point.y)); line.setAttribute('x2', String(endX)); line.setAttribute('y2', String(endY));
      label.style.transform = `translate(${side > 0 ? endX + 6 : endX - 6 - label.offsetWidth}px, ${endY - 16}px)`;
    }
  });

  return (
    <Root ref={rootRef} data-passthrough>
      <svg width={theme.stage.width} height={theme.stage.height} style={{ position: 'absolute', inset: 0 }}>
        {partList.map((part, partIndex) => <circle key={part.name + partIndex} ref={(element) => { dotRefList.current[partIndex] = element; }} r={3} fill={theme.color.primary} />)}
        {Array.from({ length: LABEL_POOL_SIZE }, (_, slot) => <line key={slot} ref={(element) => { lineRefList.current[slot] = element; }} stroke="rgba(255,214,180,.75)" strokeWidth={1} />)}
      </svg>
      {Array.from({ length: LABEL_POOL_SIZE }, (_, slot) => (
        <Label key={slot} ref={(element) => { labelRefList.current[slot] = element; }}>
          <Name ref={(element) => { nameRefList.current[slot] = element; }} />
          <Spec ref={(element) => { specRefList.current[slot] = element; }} />
        </Label>
      ))}
    </Root>
  );
}

const Root = styled.div`position: absolute; inset: 0; circle, line { transition: opacity .2s; }`;
const Label = styled.div`position: absolute; left: 0; top: 0; display: flex; align-items: baseline; gap: 8px; padding: 6px 10px; white-space: nowrap; opacity: 0; transition: opacity .2s; background: rgba(8,7,6,.78); border: 1px solid ${({ theme }) => theme.color.primaryLine};`;
const Name = styled.span`font-size: 15px; line-height: 1; font-weight: ${({ theme }) => theme.weight.bold};`;
const Spec = styled.span`font: ${({ theme }) => theme.weight.medium} 12px/1 ${({ theme }) => theme.font.mono}; color: ${({ theme }) => theme.color.primarySoft};`;
