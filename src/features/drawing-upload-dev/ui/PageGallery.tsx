import type { ReactNode } from 'react';
import Image from 'next/image';
import styled from 'styled-components';
import { getPageLabel } from '../analysisSummary';
import type { DrawingPage } from '../types';
import { Muted, PanelTitle, ScrollArea } from './sharedStyles';

export function PageGallery({ pageList, total, selectedPage, onSelect, productSummary, hasFinishedPage }: {
  pageList: DrawingPage[]; total: number; selectedPage: number; onSelect: (page: DrawingPage) => void;
  productSummary?: ReactNode; hasFinishedPage?: boolean;
}) {
  return <Root>
    {productSummary}
    <PanelTitle>{hasFinishedPage ? '부품·기타 도면' : 'PDF 페이지'} <Muted>{pageList.length} / {total}쪽 · 선택하면 원문 확대</Muted></PanelTitle>
    <Grid aria-label="PDF 페이지 목록">
      {pageList.map((page) => <Tile key={page.pageNumber} data-ocr-status={page.ocr?.status} $selected={page.pageNumber === selectedPage} onClick={() => onSelect(page)} aria-label={page.pageNumber + '쪽 원문 확대'} aria-pressed={page.pageNumber === selectedPage}>
        <Paper>
          <Image src={page.imageUrl} alt={page.pageNumber + '쪽 PDF 도면'} fill unoptimized sizes="32vw" />
          <PageTag>{page.pageNumber}쪽</PageTag>
          {page.warningList.length > 0 && <Warning>확인 필요</Warning>}
        </Paper>
        <Caption><strong>{page.ocr && 'OCR · '}{getPageLabel(page)}</strong><span>표 {page.partList.filter((part) => part.kind === 'table').length}행 · 치수 {page.dimensionList.filter((item) => item.kind !== 'candidate').length}개</span></Caption>
      </Tile>)}
      {pageList.length < total && <Pending aria-live="polite">{pageList.length + 1}쪽 처리 중</Pending>}
      {total === 0 && <Pending>이 PDF는 완제품 도면으로 지정되어 있습니다.</Pending>}
    </Grid>
  </Root>;
}
const Root = styled.section(({ theme }) => ({ minHeight: 0, display: 'flex', flexDirection: 'column', gap: theme.space[4] }));
const Grid = styled(ScrollArea)(({ theme }) => ({
  display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gridAutoRows: theme.space[8] * 3 + theme.space[4],
  alignContent: 'start', gap: theme.space[3], padding: theme.space[1],
}));
const Tile = styled.button<{ $selected: boolean }>(({ theme, $selected }) => ({
  minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', textAlign: 'left',
  border: '1px solid ' + ($selected ? theme.color.primary : theme.color.primaryLineWeak),
  background: theme.color.panel, padding: theme.space[1],
  '&:hover': { borderColor: theme.color.primarySoft },
  '&:focus-visible': { outline: '2px solid ' + theme.color.primarySoft, outlineOffset: 0 },
}));
const Paper = styled.div(({ theme }) => ({
  position: 'relative', flex: 1, minHeight: 0, background: theme.color.ink,
  img: { objectFit: 'contain' },
}));
const PageTag = styled.span(({ theme }) => ({
  position: 'absolute', left: theme.space[1], top: theme.space[1], padding: theme.space[1] + 'px ' + theme.space[2] + 'px',
  background: theme.color.primary, color: theme.color.onPrimary, fontSize: theme.size.xs, fontWeight: theme.weight.bold,
}));
const Warning = styled(PageTag)(({ theme }) => ({ left: 'auto', right: theme.space[1], background: theme.color.panelStrong, color: theme.color.warning }));
const Caption = styled.div(({ theme }) => ({
  display: 'flex', justifyContent: 'space-between', gap: theme.space[2], padding: theme.space[2] + 'px ' + theme.space[1] + 'px',
  fontSize: theme.size.xs, color: theme.color.inkMuted, whiteSpace: 'nowrap',
  strong: { fontWeight: theme.weight.medium, color: theme.color.success, overflow: 'hidden', textOverflow: 'ellipsis' },
}));
const Pending = styled.div(({ theme }) => ({
  border: '1px dashed ' + theme.color.primaryLineWeak, display: 'grid', placeItems: 'center',
  color: theme.color.inkMuted, fontSize: theme.size.md,
}));
