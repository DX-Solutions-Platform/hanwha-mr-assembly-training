import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

type Point = [number, number];
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function DrawingPointPicker({ points, onPick, onCancel }: { points: Point[]; onPick: (point: Point) => void; onCancel: () => void }) {
  const layer = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<Point>([.5, .5]);
  useEffect(() => { layer.current?.focus(); }, []);
  return <Layer ref={layer} tabIndex={0} role="group" aria-label="입체도 기준점 선택"
    onClick={(event) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      onPick([clamp((event.clientX - bounds.left) / bounds.width), clamp((event.clientY - bounds.top) / bounds.height)]);
    }}
    onKeyDown={(event) => {
      const directions: Record<string, Point> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const direction = directions[event.key];
      if (direction) {
        event.preventDefault();
        const step = event.shiftKey ? .025 : .005;
        setCursor(([x, y]) => [clamp(x + direction[0] * step), clamp(y + direction[1] * step)]);
      } else if (event.key === 'Enter') { event.preventDefault(); onPick(cursor); }
      else if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
    }}>
    <Cursor aria-hidden="true" style={{ left: cursor[0] * 100 + '%', top: cursor[1] * 100 + '%' }}>+</Cursor>
    {points.map(([x, y], index) => <Marker key={index} aria-hidden="true" style={{ left: x * 100 + '%', top: y * 100 + '%' }}>{index + 1}</Marker>)}
  </Layer>;
}

const Layer = styled.div(({ theme }) => ({
  position: 'absolute', inset: 0, cursor: 'crosshair', touchAction: 'manipulation',
  '&:focus-visible': { outline: '2px solid ' + theme.color.primary, outlineOffset: -2 },
}));
const Cursor = styled.span(({ theme }) => ({
  position: 'absolute', pointerEvents: 'none', color: theme.color.primary, font: '700 ' + theme.size.xl + 'px/1 ' + theme.font.mono,
  transform: 'translate(-50%,-50%)',
}));
const Marker = styled(Cursor)(({ theme }) => ({
  background: theme.color.primary, color: theme.color.onPrimary, padding: theme.space[1], fontSize: theme.size.sm,
}));
