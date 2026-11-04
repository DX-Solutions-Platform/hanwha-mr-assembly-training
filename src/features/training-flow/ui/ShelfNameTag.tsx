'use client';
import { useRef, type RefObject } from 'react';
import styled from 'styled-components';
import type { ScreenPoint } from '@/types/scene';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';

interface ShelfNameTagProps { productName: string; caption: string; pointListRef: RefObject<ScreenPoint[]>; productIndex: number | null; }

/** 마우스를 올린 제품 이름만 링 아래에 표시 (글자 최소화) */
export function ShelfNameTag({ productName, caption, pointListRef, productIndex }: ShelfNameTagProps) {
  const tagRef = useRef<HTMLDivElement>(null);
  useAnimationFrame(() => {
    const tag = tagRef.current; if (!tag) return;
    const point = productIndex === null ? null : pointListRef.current?.[productIndex];
    tag.style.opacity = point?.isVisible ? '1' : '0';
    if (point?.isVisible) tag.style.transform = `translate(${point.x}px, ${point.y}px) translateX(-50%)`;
  });
  return <Root ref={tagRef} data-passthrough><Name>{productName}</Name><Caption>{caption}</Caption></Root>;
}

const Root = styled.div`position: absolute; left: 0; top: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; opacity: 0; transition: opacity .2s; white-space: nowrap;`;
const Name = styled.span`font-size: ${({ theme }) => theme.size.xl}px; font-weight: ${({ theme }) => theme.weight.bold};`;
const Caption = styled.span`font: ${({ theme }) => theme.weight.medium} 13px/1 ${({ theme }) => theme.font.mono}; color: ${({ theme }) => theme.color.primarySoft}; letter-spacing: .1em;`;
