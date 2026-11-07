import type { DrawingPage, SourceRect } from '../../types';

export async function readDrawingInk(page: DrawingPage, signal: AbortSignal, area?: SourceRect, maxSize = 620) {
  const bitmap = await createImageBitmap(await (await fetch(page.imageUrl, { signal })).blob());
  const canvas = document.createElement('canvas');
  try {
    signal.throwIfAborted();
    const crop = area ?? { x: 0, y: 0, width: 1, height: 1 };
    const sourceWidth = crop.width * bitmap.width, sourceHeight = crop.height * bitmap.height;
    const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
    const width = canvas.width = Math.ceil(sourceWidth * scale), height = canvas.height = Math.ceil(sourceHeight * scale);
    const context = canvas.getContext('2d');
    if (!context || width < 12 || height < 12) return null;
    context.drawImage(bitmap, crop.x * bitmap.width, crop.y * bitmap.height, sourceWidth, sourceHeight, 0, 0, width, height);
    context.fillStyle = 'white';
    for (const line of page.lineList) for (const token of line.tokenList) {
      if (token.method === 'ocr' && ((token.confidence ?? 0) < 83 || !/[\p{L}\p{N}]/u.test(token.text))) continue;
      const rect = token.rect;
      context.fillRect((rect.x - crop.x) * width / crop.width - 1, (rect.y - crop.y) * height / crop.height - 1, rect.width * width / crop.width + 2, rect.height * height / crop.height + 2);
    }
    const pixels = context.getImageData(0, 0, width, height).data;
    const ink = Uint8Array.from({ length: width * height }, (_, index) => pixels[index * 4] + pixels[index * 4 + 1] + pixels[index * 4 + 2] < 660 ? 1 : 0);
    if (!area) {
      for (let y = 0; y < height; y++) if (y < height * .1 || y > height * .9) {
        const row = ink.subarray(y * width, (y + 1) * width);
        if (row.reduce((sum, value) => sum + value, 0) > width * .74) row.fill(0);
      }
      for (let x = 0; x < width; x++) if (x < width * .13 || x > width * .87) {
        let count = 0;
        for (let y = 0; y < height; y++) count += ink[y * width + x];
        if (count > height * .74) for (let y = 0; y < height; y++) ink[y * width + x] = 0;
      }
    }
    return { ink, width, height, crop };
  } finally { bitmap.close(); canvas.width = 0; }
}
