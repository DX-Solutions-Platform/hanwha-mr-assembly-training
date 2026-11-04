'use client';
import { useRef, type RefObject } from 'react';
import styled from 'styled-components';
import type { ScreenPoint } from '@/types/scene';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { theme } from '@/styles/theme';

export interface LeaderLabelItem { key: string; code: string; title: string; caption?: string; isActive?: boolean; }

interface LeaderLabelListProps {
  itemList: LeaderLabelItem[];
  pointListRef: RefObject<ScreenPoint[]>;
  onSelect?: (itemIndex: number) => void;
  onHover?: (itemIndex: number | null) => void;
}

const LABEL_OFFSET_X = 170;
const LABEL_RISE = 46;
const LABEL_MIN_GAP = 60;

/**
 * 부품을 가리키는 지시선 라벨 (확정 1d: 점 → 사선 → 수평선 → 라벨)
 * 매 프레임 DOM을 직접 갱신해 React 렌더 없이 3D를 따라갑니다
 */
export function LeaderLabelList({ itemList, pointListRef, onSelect, onHover }: LeaderLabelListProps) {
  const labelRefList = useRef<(HTMLButtonElement | null)[]>([]);
  const pathRefList = useRef<(SVGPathElement | null)[]>([]);
  const dotRefList = useRef<(SVGCircleElement | null)[]>([]);
  const widthCacheRef = useRef<number[]>([]);

  useAnimationFrame(() => {
    const pointList = pointListRef.current ?? [];
    const placementList = itemList.map((_, itemIndex) => {
      const point = pointList[itemIndex] ?? { x: 0, y: 0, isVisible: false };
      const side = point.x >= theme.stage.width / 2 ? 1 : -1;
      return { itemIndex, point, side, labelY: point.y - LABEL_RISE };
    });
    [1, -1].forEach((side) => {
      const sideList = placementList.filter((item) => item.side === side && item.point.isVisible).sort((a, b) => a.labelY - b.labelY);
      sideList.forEach((item, order) => { if (order > 0) item.labelY = Math.max(item.labelY, sideList[order - 1].labelY + LABEL_MIN_GAP); });
    });
    placementList.forEach(({ itemIndex, point, side, labelY }) => {
      const label = labelRefList.current[itemIndex], path = pathRefList.current[itemIndex], dot = dotRefList.current[itemIndex];
      if (!label || !path || !dot) return;
      const opacity = point.isVisible ? '1' : '0';
      label.style.opacity = opacity; path.style.opacity = opacity; dot.style.opacity = opacity;
      label.style.pointerEvents = point.isVisible ? 'auto' : 'none';
      if (!point.isVisible) return;
      const labelWidth = widthCacheRef.current[itemIndex] ||= label.offsetWidth;
      const elbowX = point.x + side * 40;
      const endX = point.x + side * LABEL_OFFSET_X;
      path.setAttribute('d', `M${point.x},${point.y} L${elbowX},${labelY} L${endX},${labelY}`);
      dot.setAttribute('cx', String(point.x)); dot.setAttribute('cy', String(point.y));
      label.style.transform = `translate(${side > 0 ? endX + 8 : endX - 8 - labelWidth}px, ${labelY - 20}px)`;
    });
  });

  return (
    <Root data-passthrough>
      <Svg width={theme.stage.width} height={theme.stage.height}>
        {itemList.map((item, itemIndex) => (
          <g key={item.key}>
            <path ref={(element) => { pathRefList.current[itemIndex] = element; }} fill="none" stroke={item.isActive ? theme.color.primary : 'rgba(255,214,180,.7)'} strokeWidth={item.isActive ? 1.6 : 1} />
            <circle ref={(element) => { dotRefList.current[itemIndex] = element; }} r={3.5} fill={theme.color.primary} />
          </g>
        ))}
      </Svg>
      {itemList.map((item, itemIndex) => (
        <Label key={item.key} ref={(element) => { labelRefList.current[itemIndex] = element; }} type="button" $isActive={!!item.isActive}
          onClick={() => onSelect?.(itemIndex)} onMouseEnter={() => onHover?.(itemIndex)} onMouseLeave={() => onHover?.(null)}>
          <Code>{item.code}</Code>
          <Title>{item.title}</Title>
          {item.caption && <Caption>{item.caption}</Caption>}
        </Label>
      ))}
    </Root>
  );
}

const Root = styled.div`position: absolute; inset: 0;`;
const Svg = styled.svg`position: absolute; inset: 0; overflow: visible; path, circle { transition: opacity .25s; }`;
const Label = styled.button<{ $isActive: boolean }>`
  position: absolute; left: 0; top: 0; display: flex; align-items: baseline; gap: 10px; padding: 8px 14px; cursor: pointer; white-space: nowrap; opacity: 0;
  background: ${({ $isActive }) => ($isActive ? 'rgba(243,115,33,.22)' : 'rgba(8,7,6,.72)')};
  border: 1px solid ${({ $isActive, theme }) => ($isActive ? theme.color.primary : theme.color.primaryLine)};
  color: ${({ theme }) => theme.color.ink}; font: inherit; transition: opacity .25s, background .15s;
  &:hover { background: rgba(243,115,33,.18); }
`;
const Code = styled.span`font: ${({ theme }) => theme.weight.bold} 13px/1 ${({ theme }) => theme.font.mono}; color: ${({ theme }) => theme.color.primary};`;
const Title = styled.span`font-size: 18px; line-height: 1; font-weight: ${({ theme }) => theme.weight.bold};`;
const Caption = styled.span`font-size: 13px; line-height: 1; color: ${({ theme }) => theme.color.inkSub};`;
