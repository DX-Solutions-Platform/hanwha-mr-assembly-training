import type { TextItem, TextStyle } from 'pdfjs-dist/types/src/display/api';
import type { SourceRect, TextToken } from './types';

export function getPdfToken(item: TextItem, transform: number[], width: number, height: number, style?: TextStyle): TextToken {
  const rotation = Math.atan2(transform[1], transform[0]), fontHeight = Math.hypot(transform[2], transform[3]);
  const ascent = (style?.ascent ?? .85) * fontHeight;
  const topX = transform[4] + Math.sin(rotation) * ascent, topY = transform[5] - Math.cos(rotation) * ascent;
  const corners = [[topX, topY], [topX + Math.cos(rotation) * item.width, topY + Math.sin(rotation) * item.width], [topX - Math.sin(rotation) * fontHeight, topY + Math.cos(rotation) * fontHeight], [topX + Math.cos(rotation) * item.width - Math.sin(rotation) * fontHeight, topY + Math.sin(rotation) * item.width + Math.cos(rotation) * fontHeight]];
  const x = Math.max(0, Math.min(...corners.map((point) => point[0])) / width), y = Math.max(0, Math.min(...corners.map((point) => point[1])) / height);
  return { text: item.str.trim(), rotation, rect: { x, y, width: Math.max(0, Math.min(1 - x, Math.max(...corners.map((point) => point[0])) / width - x)), height: Math.max(0, Math.min(1 - y, Math.max(fontHeight / height, Math.max(...corners.map((point) => point[1])) / height - y))) } };
}
type Matrix = number[];
function multiply(a: Matrix, b: Matrix): Matrix { return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]]; }
/** Locate large raster images, allowing sparse title text on a scanned page. */
export function getRasterRects(operators: { fnArray: number[]; argsArray: unknown[][] }, ops: Record<string, number>, viewport: { transform: number[]; width: number; height: number }): SourceRect[] {
  let matrix: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [], result: SourceRect[] = [];
  operators.fnArray.forEach((fn, index) => {
    const args = operators.argsArray[index];
    if (fn === ops.save || fn === ops.paintFormXObjectBegin) { stack.push([...matrix]); if (fn === ops.paintFormXObjectBegin && Array.isArray(args[0])) matrix = multiply(matrix, args[0] as number[]); }
    else if (fn === ops.restore || fn === ops.paintFormXObjectEnd) matrix = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (fn === ops.transform) matrix = multiply(matrix, args as number[]);
    else if (fn === ops.paintImageXObject || fn === ops.paintInlineImageXObject || fn === ops.paintImageMaskXObject) {
      const m = multiply(viewport.transform, matrix);
      const points = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
      const x = Math.max(0, Math.min(...points.map((p) => p[0])) / viewport.width), y = Math.max(0, Math.min(...points.map((p) => p[1])) / viewport.height);
      result.push({ x, y, width: Math.max(0, Math.min(1 - x, Math.max(...points.map((p) => p[0])) / viewport.width - x)), height: Math.max(0, Math.min(1 - y, Math.max(...points.map((p) => p[1])) / viewport.height - y)) });
    } else if (fn === ops.paintImageXObjectRepeat || fn === ops.paintInlineImageXObjectGroup || fn === ops.paintImageMaskXObjectRepeat || fn === ops.paintImageMaskXObjectGroup) result.push({ x: 0, y: 0, width: 1, height: 1 });
  });
  return result;
}
