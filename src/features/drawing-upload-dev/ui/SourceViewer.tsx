import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styled from 'styled-components';
import type { DrawingPage, Evidence } from '../types';
import { ActionButton, Muted, ScrollArea } from './sharedStyles';
import { OcrEvidenceNote } from './OcrEvidenceNote';

export function SourceViewer({ page, source, sourceUrl, onClose }: { page: DrawingPage | null; source: Evidence | null; sourceUrl: string | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (page && dialog && !dialog.open) dialog.showModal();
    if (!page && dialog?.open) dialog.close();
    const frame = page && source ? requestAnimationFrame(() => highlightRef.current?.scrollIntoView({ block: 'center', inline: 'center' })) : null;
    return () => { if (frame !== null) cancelAnimationFrame(frame); };
  }, [page, source, zoom]);
  return <Dialog ref={dialogRef} onCancel={onClose} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="source-title">
    {page && <>
      <Header><div><h2 id="source-title">{page.pageNumber}쪽 · 원문 확인</h2><Muted>추출 위치를 원본 도면에서 확인합니다.</Muted></div>
        <Actions>{sourceUrl && <ActionButton as="a" href={sourceUrl + '#page=' + page.pageNumber + '&zoom=page-width'} target="_blank" rel="noopener noreferrer">원본 PDF ↗</ActionButton>}<ActionButton onClick={() => setZoom((value) => value === 1 ? 2 : 1)}>{zoom === 1 ? '2배 확대' : '전체 보기'}</ActionButton><ActionButton onClick={onClose} autoFocus>닫기 ×</ActionButton></Actions>
      </Header>
      <Body>
        <PageArea><Paper style={{ width: zoom * 100 + '%' }}>
          <Image src={page.imageUrl} alt={page.pageNumber + '쪽 원본 PDF 도면'} width={Math.round(page.width)} height={Math.round(page.height)} unoptimized />
          {source && source.pageNumber === page.pageNumber && <Highlight ref={highlightRef} aria-label="추출된 원문 위치" style={{ left: source.rect.x * 100 + '%', top: source.rect.y * 100 + '%', width: source.rect.width * 100 + '%', height: source.rect.height * 100 + '%' }} />}
        </Paper></PageArea>
        <Detail>
          <Label>선택한 원문</Label><OcrEvidenceNote source={source} /><Quote>{source?.text ?? '결과 목록의 출처를 선택하면 해당 위치가 강조됩니다.'}</Quote>
          <Label>페이지 정보</Label><Muted>부품표 {page.partList.filter((part) => part.kind === 'table').length}행 · 치수 표기 {page.dimensionList.filter((item) => item.kind !== 'candidate').length}개</Muted>
          <Muted>페이지 단위: {page.unit ?? '미확인'}</Muted>{page.unitSource && <Quote>{page.unitSource}</Quote>}
          {page.warningList.map((warning) => <Warning key={warning}>{warning}</Warning>)}
          <Label>읽은 텍스트</Label><RawText>{page.lineList.map((line) => line.text).join('\n') || '읽을 수 있는 텍스트가 없습니다.'}</RawText>
        </Detail>
      </Body>
    </>}
  </Dialog>;
}
const Dialog = styled.dialog(({ theme }) => ({
  width: 'min(94vw,' + theme.stage.width * 0.85 + 'px)', height: '92vh', maxWidth: 'none', maxHeight: 'none', padding: theme.space[5],
  color: theme.color.ink, background: theme.color.bgMid, border: '1px solid ' + theme.color.primaryLine, fontFamily: theme.font.main,
  '&::backdrop': { background: theme.color.panelStrong }, '&[open]': { display: 'flex', flexDirection: 'column', gap: theme.space[5] },
}));
const Header = styled.div(({ theme }) => ({
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.space[4], flexShrink: 0,
  h2: { margin: '0 0 ' + theme.space[2] + 'px', fontSize: theme.size.xl },
}));
const Actions = styled.div(({ theme }) => ({ display: 'flex', gap: theme.space[3] }));
const Body = styled.div(({ theme }) => ({ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,2.5fr) minmax(0,1fr)', gap: theme.space[5] }));
const PageArea = styled(ScrollArea)(({ theme }) => ({ background: theme.color.bgEdge }));
const Paper = styled.div({ position: 'relative', minWidth: '100%', img: { width: '100%', height: 'auto', display: 'block' } });
const Highlight = styled.div(({ theme }) => ({
  position: 'absolute', border: '2px solid ' + theme.color.primary, background: theme.color.primaryFill,
  minWidth: theme.space[2], minHeight: theme.space[2], pointerEvents: 'none',
}));
const Detail = styled(ScrollArea)(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: theme.space[3] }));
const Label = styled.strong(({ theme }) => ({ fontSize: theme.size.md, color: theme.color.primarySoft, fontWeight: theme.weight.medium }));
const Quote = styled.p(({ theme }) => ({ margin: 0, padding: theme.space[3], border: '1px solid ' + theme.color.primaryLineWeak, lineHeight: 1.7, fontSize: theme.size.md, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }));
const Warning = styled.p(({ theme }) => ({ margin: 0, fontSize: theme.size.sm, lineHeight: 1.7, color: theme.color.warning }));
const RawText = styled.pre(({ theme }) => ({ margin: 0, fontFamily: theme.font.mono, fontSize: theme.size.sm, lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }));
