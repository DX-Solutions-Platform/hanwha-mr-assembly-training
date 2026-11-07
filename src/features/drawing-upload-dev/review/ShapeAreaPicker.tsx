import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import styled from 'styled-components';
import type { SourceRect } from '../types';

type Point = { x: number; y: number };
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const rectangle = (first: Point, last: Point): SourceRect => ({
  x: Math.min(first.x, last.x), y: Math.min(first.y, last.y),
  width: Math.abs(first.x - last.x), height: Math.abs(first.y - last.y),
});

export function ShapeAreaPicker({ onChoose, onCancel }: { onChoose: (rect: SourceRect) => void; onCancel: () => void }) {
  const layer = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<Point | null>(null);
  const [point, setPoint] = useState<Point>({ x: .5, y: .5 });
  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => { layer.current?.focus(); }, []);
  const rect = anchor ? rectangle(anchor, point) : null;
  const position = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: clamp((event.clientX - bounds.left) / bounds.width), y: clamp((event.clientY - bounds.top) / bounds.height) };
  };
  const finish = (end: Point) => {
    if (!anchor) return;
    const area = rectangle(anchor, end);
    if (area.width >= .02 && area.height >= .02) onChoose(area);
    else { setIsSmall(true); setAnchor(null); }
  };
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? .1 : .02;
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
    else if (event.key === 'Enter') {
      event.preventDefault();
      if (anchor) finish(point);
      else { setIsSmall(false); setAnchor(point); }
    } else if (arrows[event.key]) {
      event.preventDefault();
      const [dx, dy] = arrows[event.key];
      setPoint({ x: clamp(point.x + dx), y: clamp(point.y + dy) });
    }
  };
  return <Layer ref={layer} tabIndex={0} role="group" aria-label="도면 형상 영역 선택" onKeyDown={onKey}
    onPointerDown={(event) => {
      if (event.button !== 0) return;
      const start = position(event);
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsSmall(false); setPoint(start); setAnchor(start);
    }}
    onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setPoint(position(event)); }}
    onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) finish(position(event)); }}
    onPointerCancel={() => setAnchor(null)}>
    {rect && <Box style={{ left: rect.x * 100 + '%', top: rect.y * 100 + '%', width: rect.width * 100 + '%', height: rect.height * 100 + '%' }} />}
    <Cursor aria-hidden="true" style={{ left: point.x * 100 + '%', top: point.y * 100 + '%' }}>+</Cursor>
    {isSmall && <Hint role="status">부품이 들어가도록 더 넓게 선택해 주세요.</Hint>}
  </Layer>;
}

const Layer = styled.div(({ theme }) => ({
  position: 'absolute', inset: 0, cursor: 'crosshair', touchAction: 'none', userSelect: 'none',
  '&:focus-visible': { outline: '2px solid ' + theme.color.primary, outlineOffset: -2 },
}));
const Box = styled.div(({ theme }) => ({ position: 'absolute', pointerEvents: 'none', border: '2px dashed ' + theme.color.primary, background: theme.color.primaryFill }));
const Cursor = styled.span(({ theme }) => ({ position: 'absolute', pointerEvents: 'none', color: theme.color.primary, font: '700 ' + theme.size.xl + 'px ' + theme.font.mono, transform: 'translate(-50%,-50%)' }));
const Hint = styled.span(({ theme }) => ({ position: 'sticky', top: 0, display: 'inline-block', padding: theme.space[2], color: theme.color.ink, background: theme.color.bgCenter, fontSize: theme.size.sm }));
