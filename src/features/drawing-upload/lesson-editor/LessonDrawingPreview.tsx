import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { ActionButton, Muted, ScrollArea } from '@/features/drawing-upload-dev/ui/sharedStyles';

const zoomLevels = [75, 100, 125, 150, 200, 250];
const fitZoom = zoomLevels.indexOf(100);

export function LessonDrawingPreview({ file, onClose, onDownload, documentName = '조립 도면' }: {
  file: { blob: Blob; name: string };
  documentName?: string;
  onClose: () => void;
  onDownload: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(fitZoom);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [paint, setPaint] = useState<{ key: string; failed?: boolean }>();
  const renderKey = [page, zoom, size.width, size.height].join(':');
  const current = paint?.key === renderKey ? paint : undefined;
  const ready = !!current && !current.failed;

  useEffect(() => {
    const element = dialog.current;
    const view = scroll.current;
    if (!element || !view) return;
    element.showModal();
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    });
    observer.observe(view);
    return () => {
      observer.disconnect();
      element.close();
    };
  }, []);

  useEffect(() => {
    let active = true;
    let task: PDFDocumentLoadingTask | undefined;
    async function load() {
      const pdfjs = await import('pdfjs-dist');
      const data = new Uint8Array(await file.blob.arrayBuffer());
      if (!active) return;
      pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.mjs';
      task = pdfjs.getDocument({ data, isEvalSupported: false, enableXfa: false });
      const document = await task.promise;
      if (active) setPdf(document);
    }
    void load().catch(() => {
      if (active) setLoadFailed(true);
    });
    return () => {
      active = false;
      void task?.destroy().catch(() => undefined);
    };
  }, [file.blob]);

  useEffect(() => {
    const target = canvas.current;
    if (!pdf || !target || size.width <= 0 || size.height <= 0) return;
    let active = true;
    let task: RenderTask | undefined;
    async function render(document: PDFDocumentProxy, element: HTMLCanvasElement) {
      const sheet = await document.getPage(page);
      if (!active) return;
      try {
        const base = sheet.getViewport({ scale: 1 });
        const fit = Math.min(size.width / base.width, size.height / base.height);
        const viewport = sheet.getViewport({ scale: fit * zoomLevels[zoom] / 100 });
        const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(10_000_000 / (viewport.width * viewport.height)));
        const context = element.getContext('2d');
        if (!context) throw new Error('도면을 표시할 수 없습니다.');
        element.width = Math.ceil(viewport.width * ratio);
        element.height = Math.ceil(viewport.height * ratio);
        element.style.width = viewport.width + 'px';
        element.style.height = viewport.height + 'px';
        task = sheet.render({ canvasContext: context, viewport, transform: [ratio, 0, 0, ratio, 0, 0], background: 'white' });
        await task.promise;
        if (active) setPaint({ key: renderKey });
      } finally {
        sheet.cleanup();
      }
    }
    void render(pdf, target).catch(() => {
      if (active) setPaint({ key: renderKey, failed: true });
    });
    return () => {
      active = false;
      task?.cancel();
    };
  }, [pdf, page, zoom, size, renderKey]);

  function goTo(value: number) {
    if (!pdf || !Number.isInteger(value) || value < 1 || value > pdf.numPages) return;
    setPage(value);
    scroll.current?.scrollTo(0, 0);
  }

  const error = loadFailed || current?.failed;
  return <Dialog ref={dialog} aria-labelledby="lesson-pdf-preview-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <Header>
      <div>
        <h2 id="lesson-pdf-preview-title">{documentName} 미리보기</h2>
        <Muted>{file.name}</Muted>
      </div>
      <ActionButton type="button" $primary onClick={onDownload}>PDF 다운로드</ActionButton>
      <ActionButton type="button" onClick={onClose}>닫기</ActionButton>
    </Header>
    <Toolbar>
      <ActionButton type="button" disabled={!pdf || page <= 1} onClick={() => goTo(page - 1)}>이전 쪽</ActionButton>
      <form onSubmit={(event) => {
        event.preventDefault();
        const value = new FormData(event.currentTarget).get('page');
        goTo(Number(value));
      }}>
        <PageNumber key={page} name="page" aria-label="페이지 번호" type="number" min={1} max={pdf?.numPages} step={1}
          required defaultValue={page} disabled={!pdf} />
        <Muted>/ {pdf?.numPages ?? '–'}</Muted>
        <ActionButton type="submit" disabled={!pdf}>이동</ActionButton>
      </form>
      <ActionButton type="button" disabled={!pdf || page >= pdf.numPages} onClick={() => goTo(page + 1)}>다음 쪽</ActionButton>
      <Zoom>
        <ActionButton type="button" aria-label="도면 축소" disabled={!pdf || zoom <= 0} onClick={() => setZoom(zoom - 1)}>−</ActionButton>
        <Muted>{zoomLevels[zoom]}%</Muted>
        <ActionButton type="button" aria-label="도면 확대" disabled={!pdf || zoom >= zoomLevels.length - 1} onClick={() => setZoom(zoom + 1)}>+</ActionButton>
        <ActionButton type="button" disabled={!pdf || zoom === fitZoom} onClick={() => setZoom(fitZoom)}>페이지 맞춤</ActionButton>
      </Zoom>
    </Toolbar>
    <PreviewRegion>
      <DocumentScroll ref={scroll} tabIndex={0} aria-label="도면 페이지 영역" aria-busy={!ready && !error}>
        <Paper>
          <Canvas ref={canvas} $visible={ready} role="img" aria-label={documentName + ' ' + page + '쪽'} aria-hidden={!ready} />
        </Paper>
      </DocumentScroll>
      {error ? <Message role="alert">웹에서 도면을 표시할 수 없습니다. 위의 PDF 다운로드 버튼으로 파일을 열 수 있습니다.</Message>
        : !ready && <Message role="status">{pdf ? page + '쪽을 그리는 중…' : '도면을 여는 중…'}</Message>}
    </PreviewRegion>
  </Dialog>;
}

const Dialog = styled.dialog(({ theme }) => ({
  position: 'fixed', inset: 0, width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none',
  margin: 0, padding: 0, border: 0, color: theme.color.ink, background: theme.color.bgMid,
  '&[open]': { display: 'grid', gridTemplateRows: 'auto auto minmax(0, 1fr)' },
  '&::backdrop': { background: theme.color.bgMid },
}));
const Header = styled.header(({ theme }) => ({
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: theme.space[2], padding: theme.space[3],
  background: theme.color.panel, borderBottom: '1px solid ' + theme.color.primaryLineWeak,
  '& > div': { flex: 1, minWidth: 0, overflowWrap: 'anywhere' },
  '& h2': { margin: 0, fontSize: theme.size.xl },
}));
const Toolbar = styled.nav.attrs({ 'aria-label': '도면 페이지 및 확대 조작' })(({ theme }) => ({
  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: theme.space[2],
  padding: theme.space[2] + 'px ' + theme.space[3] + 'px',
  borderBottom: '1px solid ' + theme.color.primaryLineWeak,
  '& form': { display: 'flex', alignItems: 'center', gap: theme.space[2] },
  '& button': { minHeight: 34, paddingInline: theme.space[3] },
}));
const PageNumber = styled.input(({ theme }) => ({
  width: 59, height: 34, paddingInline: theme.space[2], color: theme.color.ink, background: theme.color.panel,
  border: '1px solid ' + theme.color.primaryLineWeak, borderRadius: 4, fontVariantNumeric: 'tabular-nums',
}));
const Zoom = styled.div(({ theme }) => ({
  display: 'flex', alignItems: 'center', gap: theme.space[2], marginInlineStart: 'auto',
  fontVariantNumeric: 'tabular-nums',
}));
const PreviewRegion = styled.div({ position: 'relative', minWidth: 0, minHeight: 0 });
const DocumentScroll = styled(ScrollArea)(({ theme }) => ({
  position: 'absolute', inset: 0, padding: theme.space[3], scrollbarGutter: 'stable both-edges',
}));
const Paper = styled.div({ display: 'flex', minHeight: '100%', minWidth: 'max-content' });
const Canvas = styled.canvas<{ $visible: boolean }>(({ $visible }) => ({
  display: 'block', margin: 'auto', background: 'white', boxShadow: '0 4px 14px #0005',
  visibility: $visible ? 'visible' : 'hidden',
}));
const Message = styled.p(({ theme }) => ({
  position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', margin: 0, padding: theme.space[3],
  color: theme.color.ink, textAlign: 'center', pointerEvents: 'none',
}));
