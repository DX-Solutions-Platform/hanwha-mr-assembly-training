import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { buildTextLines } from './textLayout';
import { extractParts } from './extractParts';
import { extractDimensions } from './extractDimensions';
import type { AnalysisProgress, DrawingPage, PdfAnalysisOptions, TextToken } from './types';
import { getPdfToken, getRasterRects } from './pdfPageText';
import { createOcrSession } from './ocr/createOcrSession';
import { markOcrEvidence, mergeOcrTokens, needsPageOcr } from './ocr/ocrModel';
import { makePagePreview, readPageOcr } from './ocr/readPageOcr';

function checkAbort(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('분석을 중지했습니다.', 'AbortError');
}

export async function analyzePdf(
  file: File, signal: AbortSignal,
  onProgress: (progress: AnalysisProgress) => void,
  onPage: (page: DrawingPage) => void,
  options: PdfAnalysisOptions = {},
) {
  if (file.size > 50 * 1024 * 1024) throw new Error('50 MB 이하의 PDF를 선택해 주세요.');
  const data = new Uint8Array(await file.arrayBuffer());
  checkAbort(signal);
  if (!new TextDecoder('latin1').decode(data.subarray(0, 1024)).includes('%PDF-')) throw new Error('PDF 형식의 파일이 아닙니다. 원본 PDF를 다시 선택해 주세요.');
  const pdfjs = await import('pdfjs-dist');
  checkAbort(signal);
  pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.mjs';
  const loadingTask = pdfjs.getDocument({ data, isEvalSupported: false, enableXfa: false, useSystemFonts: true });
  const ocrSession = createOcrSession(signal);
  let destroyPromise: Promise<void> | undefined;
  const destroy = () => destroyPromise ??= loadingTask.destroy();
  const handleAbort = () => { void destroy().catch(() => undefined); };
  signal.addEventListener('abort', handleAbort, { once: true });
  try {
    const document = await loadingTask.promise;
    checkAbort(signal);
    if (document.numPages > 200) throw new Error('한 번에 200쪽까지 분석할 수 있습니다. PDF를 나누어 올려 주세요.');
    onProgress({ task: 'file', completed: 1, total: document.numPages });
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      checkAbort(signal);
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const nativeTokens = content.items.filter((item): item is TextItem => 'str' in item && !!item.str.trim()).map((item) => getPdfToken(item, pdfjs.Util.transform(viewport.transform, item.transform), viewport.width, viewport.height, content.styles[item.fontName])).filter((token) => token.rect.width > 0 && token.rect.height > 0);
      const imageRects = getRasterRects(await page.getOperatorList(), pdfjs.OPS, viewport);
      const needsOcr = options.ocrMode === 'force' || needsPageOcr(nativeTokens, imageRects);
      const scale = needsOcr ? Math.min(300 / 72, 3508 / Math.max(viewport.width, viewport.height), Math.sqrt(8_000_000 / (viewport.width * viewport.height))) : Math.min(1300 / viewport.width, Math.sqrt(2_000_000 / (viewport.width * viewport.height)));
      const renderViewport = page.getViewport({ scale });
      const canvas = window.document.createElement('canvas');
      canvas.width = Math.ceil(renderViewport.width); canvas.height = Math.ceil(renderViewport.height);
      let imageUrl: string | undefined;
      try {
        onProgress({ task: 'render', completed: pageNumber - 1, total: document.numPages, pageNumber });
        const context = canvas.getContext('2d');
        if (!context) throw new Error('PDF 이미지를 표시할 수 없습니다. 브라우저를 다시 열어 주세요.');
        await page.render({ canvasContext: context, viewport: renderViewport, background: 'white' }).promise;
        checkAbort(signal);
        imageUrl = await makePagePreview(canvas);
        onProgress({ task: 'text', completed: pageNumber - 1, total: document.numPages, pageNumber });
        checkAbort(signal);
        const recognized = needsOcr ? await readPageOcr(canvas, ocrSession, signal, (ocr) => onProgress({ task: 'ocr', completed: pageNumber - 1, total: document.numPages, pageNumber, ocr })) : null;
        const tokenList: TextToken[] = recognized ? options.ocrMode === 'force' && recognized.info.status === 'complete' ? recognized.tokens : mergeOcrTokens(nativeTokens, recognized.tokens) : nativeTokens;
        const lineList = buildTextLines(tokenList);
        onProgress({ task: 'parts', completed: pageNumber - 1, total: document.numPages, pageNumber });
        const { partList, tableLineSet, tableRectList } = extractParts(lineList, tokenList, pageNumber);
        onProgress({ task: 'dimensions', completed: pageNumber - 1, total: document.numPages, pageNumber });
        const dimensions = extractDimensions(lineList, tableLineSet, pageNumber, tableRectList);
        partList.forEach((part) => { part.source = markOcrEvidence(part.source, tokenList); });
        dimensions.dimensionList.forEach((dimension) => { dimension.source = markOcrEvidence(dimension.source, tokenList); });
        const textCount = tokenList.reduce((count, token) => count + token.text.length, 0);
        const warningList: string[] = [];
        if (recognized) warningList.push(...recognized.warnings);
        else if (textCount < 20) warningList.push('읽을 수 있는 텍스트가 적습니다. 이미지가 없는 벡터 윤곽 도면은 원문 확인이 필요합니다.');
        if (!dimensions.unit && dimensions.dimensionList.some((item) => item.kind !== 'angle' && item.kind !== 'thread')) warningList.push('길이 단위가 명시되지 않은 값은 단위를 확정하지 않았습니다.');
        checkAbort(signal);
        onPage({ pageNumber, width: viewport.width, height: viewport.height, imageUrl, textCount, lineList, partList, ...dimensions, warningList, ...(recognized ? { ocr: recognized.info } : {}) });
        imageUrl = undefined; // ownership transfers to the caller
      } finally {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        canvas.width = 0; canvas.height = 0; page.cleanup();
      }
      // Let real page results paint before continuing, including on slower devices.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
    checkAbort(signal);
    onProgress({ task: 'finish', completed: document.numPages, total: document.numPages });
  } finally {
    ocrSession.close();
    signal.removeEventListener('abort', handleAbort);
    await destroy().catch(() => undefined);
  }
}
