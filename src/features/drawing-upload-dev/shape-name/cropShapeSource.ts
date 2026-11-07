import type { DrawingPage, SourceRect } from '../types';
import { MAX_SHAPE_IMAGE_LENGTH } from './shapeNameTypes';
import { hasMountingPlateEvidence } from './mountingPlateEvidence';
import { OCR_CONFIDENCE_THRESHOLD } from '../ocr/ocrModel';

function inkBounds(context: CanvasRenderingContext2D, width: number, height: number, ignoreFrame: boolean) {
  const pixels = context.getImageData(0, 0, width, height).data;
  const rowCounts = new Uint32Array(height);
  const columnCounts = new Uint32Array(width);
  const ink = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const channel = index * 4;
      if (pixels[channel] + pixels[channel + 1] + pixels[channel + 2] >= 510) continue;
      ink[index] = 1;
      rowCounts[y]++;
      columnCounts[x]++;
    }
  }
  // Ignore long frame lines near the edges of the page.
  const isFrameRow = (y: number) => ignoreFrame && rowCounts[y] > width * .8 && (y < height * .09 || y > height * .91);
  const isFrameColumn = (x: number) => ignoreFrame && columnCounts[x] > height * .8 && (x < width * .09 || x > width * .91);
  let left = width, top = height, right = 0, bottom = 0, count = 0;
  for (let y = 0; y < height; y++) {
    if (isFrameRow(y)) {
      context.fillRect(0, y, width, 1);
      ink.fill(0, y * width, (y + 1) * width);
      continue;
    }
    for (let x = 0; x < width; x++) {
      if (isFrameColumn(x)) ink[y * width + x] = 0;
      if (!ink[y * width + x]) continue;
      left = Math.min(left, x);
      right = Math.max(right, x + 1);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + 1);
      count++;
    }
  }
  for (let x = 0; x < width; x++) if (isFrameColumn(x)) context.fillRect(x, 0, 1, height);
  if (count < 120 || right - left < 28 || bottom - top < 28) return null;
  const margin = Math.ceil(Math.max(width, height) * .015);
  left = Math.max(0, left - margin);
  top = Math.max(0, top - margin);
  right = Math.min(width, right + margin);
  bottom = Math.min(height, bottom + margin);
  return { left, top, width: right - left, height: bottom - top, ink };
}

export async function cropShapeSource(page: DrawingPage, signal: AbortSignal, area?: SourceRect): Promise<{ image: string; rect: SourceRect; hasPlateEvidence: boolean } | null> {
  const response = await fetch(page.imageUrl, { signal });
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement('canvas');
  const crop = document.createElement('canvas');
  try {
    signal.throwIfAborted();
    const x = area ? Math.floor(area.x * bitmap.width) : 0;
    const y = area ? Math.floor(area.y * bitmap.height) : 0;
    canvas.width = area ? Math.min(bitmap.width, Math.ceil((area.x + area.width) * bitmap.width)) - x : bitmap.width;
    canvas.height = area ? Math.min(bitmap.height, Math.ceil((area.y + area.height) * bitmap.height)) - y : bitmap.height;
    if (canvas.width < 28 || canvas.height < 28) return null;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(bitmap, -x, -y);
    context.fillStyle = 'white';
    for (const line of page.lineList) {
      for (const { rect, method, confidence, text } of line.tokenList) {
        // OCR may interpret a faint outline or symbol as a word. Keep that linework.
        if (method === 'ocr' && ((confidence ?? 0) < OCR_CONFIDENCE_THRESHOLD || !/[\p{L}\p{N}]/u.test(text))) continue;
        context.fillRect(rect.x * bitmap.width - x - 3, rect.y * bitmap.height - y - 4, rect.width * bitmap.width + 6, rect.height * bitmap.height + 8);
      }
    }
    const bounds = inkBounds(context, canvas.width, canvas.height, !area);
    if (!bounds) return null;
    const scale = Math.min(1, 1024 / Math.max(bounds.width, bounds.height));
    crop.width = Math.ceil(bounds.width * scale);
    crop.height = Math.ceil(bounds.height * scale);
    const cropContext = crop.getContext('2d');
    if (!cropContext) return null;
    cropContext.drawImage(canvas, bounds.left, bounds.top, bounds.width, bounds.height, 0, 0, crop.width, crop.height);
    const image = crop.toDataURL('image/jpeg', .82).split(',')[1];
    if (!image || image.length > MAX_SHAPE_IMAGE_LENGTH) return null;
    return {
      image,
      rect: { x: (x + bounds.left) / bitmap.width, y: (y + bounds.top) / bitmap.height, width: bounds.width / bitmap.width, height: bounds.height / bitmap.height },
      hasPlateEvidence: hasMountingPlateEvidence(bounds.ink, canvas.width, canvas.height),
    };
  } finally {
    bitmap.close();
    canvas.width = 0;
    crop.width = 0;
  }
}
