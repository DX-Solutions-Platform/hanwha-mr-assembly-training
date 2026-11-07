import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styled from 'styled-components';
import type { DrawingPage, Evidence, SourceRect } from '../types';
import { ActionButton, Muted, ScrollArea } from '../ui/sharedStyles';
import { ReviewHeader, ReviewPanel, ReviewTitle } from './reviewStyles';
import { OcrEvidenceNote } from '../ui/OcrEvidenceNote';
import { ShapeAreaPicker } from './ShapeAreaPicker';
import { DrawingPointPicker } from './DrawingPointPicker';

export function ReviewDocument({ pageList, pageNumber, source, sourceUrl, onPageChange, shapeSelection, pointSelection, emptyMessage }: {
  pageList: DrawingPage[]; pageNumber: number; source: Evidence | null; sourceUrl: string | null; onPageChange: (number: number) => void;
  shapeSelection?: { onChoose: (pageNumber: number, rect: SourceRect) => void; onCancel: () => void; instruction?: string };
  pointSelection?: { points: [number, number][]; instruction: string; onPick: (point: [number, number]) => void; onCancel: () => void };
  emptyMessage?: string;
}) {
  const [zoom, setZoom] = useState(1);
  const highlightRef = useRef<HTMLDivElement>(null);
  const page = pageList.find((item) => item.pageNumber === pageNumber) ?? pageList[0];
  useEffect(() => {
    const frame = source ? requestAnimationFrame(() => highlightRef.current?.scrollIntoView({ block: 'center', inline: 'center' })) : null;
    return () => { if (frame !== null) cancelAnimationFrame(frame); };
  }, [source, zoom]);
  return <ReviewPanel aria-label="검토 원문 도면">
    <ReviewHeader>
      <ReviewTitle>원문 대조</ReviewTitle>
      <Controls>
        <PageSelect aria-label="검토 원문 페이지" value={page?.pageNumber ?? 1} onChange={(event) => onPageChange(Number(event.target.value))}>{pageList.map((item) => <option key={item.pageNumber} value={item.pageNumber}>{item.pageNumber}쪽</option>)}</PageSelect>
        <SmallButton onClick={() => setZoom((value) => value === 1 ? 2 : 1)}>{zoom === 1 ? '2배 확대' : '전체 보기'}</SmallButton>
        {sourceUrl && page && <SmallButton as="a" href={sourceUrl + '#page=' + page.pageNumber} target="_blank" rel="noopener noreferrer">PDF ↗</SmallButton>}
      </Controls>
    </ReviewHeader>
    <SourceText>{pointSelection ? <>
      <Muted role="status">{pointSelection.instruction} 방향키와 Enter로도 선택할 수 있습니다.</Muted>
      <Controls><SmallButton onClick={pointSelection.onCancel}>기준점 선택 취소</SmallButton></Controls>
    </> : shapeSelection ? <>
      <Muted role="status">{shapeSelection.instruction ?? '부품 하나의 윤곽을 드래그해 선택하세요.'} 키보드는 방향키로 이동하고 Enter로 각 모서리를 지정합니다.</Muted>
      <Controls><SmallButton onClick={shapeSelection.onCancel}>영역 선택 취소</SmallButton></Controls>
    </> : <><Muted>{source ? '선택한 원문 · ' + source.pageNumber + '쪽' : emptyMessage ?? '부품의 출처 또는 치수를 선택하세요.'}</Muted><OcrEvidenceNote source={source} />{source && <span>{source.text}</span>}</>}</SourceText>
    <CanvasArea>{page && <Paper style={{ width: zoom * 100 + '%' }}>
      <Image src={page.imageUrl} alt={page.pageNumber + '쪽 부품 검토 원문'} width={Math.round(page.width)} height={Math.round(page.height)} unoptimized />
      {pointSelection ? <DrawingPointPicker key={page.pageNumber} points={pointSelection.points} onCancel={pointSelection.onCancel} onPick={pointSelection.onPick} />
        : shapeSelection ? <ShapeAreaPicker key={page.pageNumber} onCancel={shapeSelection.onCancel} onChoose={(rect) => shapeSelection.onChoose(page.pageNumber, rect)} />
        : source?.pageNumber === page.pageNumber && <Highlight ref={highlightRef} aria-label="검토 원문 강조 위치" style={{ left: source.rect.x * 100 + '%', top: source.rect.y * 100 + '%', width: source.rect.width * 100 + '%', height: source.rect.height * 100 + '%' }} />}
    </Paper>}</CanvasArea>
  </ReviewPanel>;
}
const Controls = styled.div(({ theme }) => ({ display: 'flex', alignItems: 'center', gap: theme.space[2] }));
const SmallButton = styled(ActionButton)(({ theme }) => ({ minHeight: theme.space[6], padding: '0 ' + theme.space[2] + 'px', fontSize: theme.size.sm }));
const PageSelect = styled.select(({ theme }) => ({ background: theme.color.bgEdge, color: theme.color.ink, border: '1px solid ' + theme.color.primaryLine, font: 'inherit', fontSize: theme.size.sm, minHeight: theme.space[6], padding: theme.space[1], '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft } }));
const SourceText = styled.div(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[1], padding: theme.space[3], fontSize: theme.size.sm, lineHeight: 1.6, maxHeight: theme.space[8] * 2, overflow: 'auto', flexShrink: 0, span: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }));
const CanvasArea = styled(ScrollArea)(({ theme }) => ({ flex: 1, background: theme.color.bgEdge }));
const Paper = styled.div({ position: 'relative', minWidth: '100%', img: { display: 'block', width: '100%', height: 'auto' } });
const Highlight = styled.div(({ theme }) => ({ position: 'absolute', pointerEvents: 'none', border: '2px solid ' + theme.color.primary, background: theme.color.primaryFill, minWidth: theme.space[2], minHeight: theme.space[2] }));
