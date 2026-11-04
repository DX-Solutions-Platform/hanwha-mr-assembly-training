'use client';

/** PDF 페이지 썸네일 + 부품 번호(6~8자리) 추출 */
export async function readPdfPages(file: File, onPage: (pageImageUrl: string, partCodeList: string[]) => void, maxPageCount = 8) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const partCodeSet = new Set<string>();
  for (let pageNumber = 1; pageNumber <= Math.min(maxPageCount, pdfDocument.numPages); pageNumber++) {
    const page = await pdfDocument.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 520 / baseViewport.width });
    const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height;
    const context = canvas.getContext('2d')!; context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const textContent = await page.getTextContent();
    textContent.items.forEach((item) => { if ('str' in item) (item.str.match(/\b1\d{5,7}\b/g) ?? []).forEach((code) => partCodeSet.add(code)); });
    onPage(canvas.toDataURL('image/jpeg', 0.8), Array.from(partCodeSet));
  }
}
