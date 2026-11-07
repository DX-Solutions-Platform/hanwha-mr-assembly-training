import type { ReviewDocument, ReviewedPart, ReviewGroup } from '../review/reviewTypes';
import { parseReviewQuantity } from '../review/reviewModel';
import type { DrawingPage, Evidence } from '../types';
import { detectFlangeOutlines, outlineDimensions, outlineRect, type DetectedFlange } from './detectFlangeOutline';
import { parseFlangeParameters, toFlangeDraft } from './flangeModel';
import type { FlangeSource } from './flangeTypes';

type Reference = { value: number; evidence: Evidence };

function findReference(page: DrawingPage, pattern: RegExp, max: number): Reference | undefined {
  const matches = page.lineList.flatMap((line) => [line, ...line.tokenList]).flatMap((token) => {
    const value = Number(token.text.trim().match(pattern)?.[1]);
    return value > 0 && value <= max ? [{ value, evidence: { ...token, pageNumber: page.pageNumber } }] : [];
  });
  return new Set(matches.map(({ value }) => value)).size === 1 ? matches[0] : undefined;
}

export async function readPageFlangeOutlines(page: DrawingPage, signal: AbortSignal) {
  const response = await fetch(page.imageUrl, { signal });
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement('canvas');
  try {
    signal.throwIfAborted();
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return [];
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    const ink = new Uint8Array(bitmap.width * bitmap.height);
    for (let index = 0; index < ink.length; index++) {
      const pixel = index * 4;
      ink[index] = image[pixel] + image[pixel + 1] + image[pixel + 2] < 540 ? 1 : 0;
    }
    return detectFlangeOutlines(ink, bitmap.width, bitmap.height).map((shape) => ({ shape, width: bitmap.width, height: bitmap.height }));
  } finally { bitmap.close(); canvas.width = 0; }
}

export function createOutlineFlangeSource({ shape, width, height, page, document, pages, sourceUrl, partNumber, part, group, allowReferences }: {
  shape: DetectedFlange; width: number; height: number; page: DrawingPage; document: ReviewDocument; pages: DrawingPage[];
  sourceUrl: string; partNumber: string; part?: ReviewedPart; group?: ReviewGroup; allowReferences: boolean;
}): FlangeSource | null {
  const diameter = allowReferences ? findReference(page, /^(?:OD|외경|OUTER DIAMETER)\s*[:=]?\s*[Ø⌀Φ]?\s*(\d+(?:\.\d+)?)\s*mm$/i, 2000) : undefined;
  const thickness = allowReferences ? findReference(page, /^(?:THK|두께|THICKNESS)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*mm$/i, 500) : undefined;
  const parameters = outlineDimensions(shape, diameter?.value ?? 100, thickness?.value ?? (diameter?.value ?? 100) / 10);
  const quantity = parseReviewQuantity(part?.quantity ?? '');
  const values = {
    parameters, part: {
      partNumber, name: part?.name && !part.hasTemporaryName ? part.name : '원형 플랜지',
      material: part?.material ?? '', quantity: quantity !== null && Number.isSafeInteger(quantity) && quantity <= 10000 ? String(quantity) : '',
    },
  };
  if (parseFlangeParameters(toFlangeDraft(values).parameters).issues.length) return null;
  const outer = { pageNumber: page.pageNumber, text: '정면도 외곽 원', rect: outlineRect([shape.outer], width, height) };
  const bore = { ...outer, text: '중앙 구멍 윤곽', rect: outlineRect([shape.bore], width, height) };
  const holes = { ...outer, text: '정면도에서 검출한 볼트 구멍 ' + shape.holes.length + '개', rect: outlineRect(shape.holes, width, height) };
  const key = 'outline:' + page.pageNumber + ':' + [outer.rect.x, outer.rect.y, outer.rect.width].map((value) => Math.round(value * 1000)).join(':');
  return {
    document, values, pageList: pages, sourceUrl,
    partEvidence: group?.recordList.find(({ source }) => source.pageNumber === page.pageNumber)?.source ?? outer,
    outline: { key, hasDiameter: !!diameter, hasThickness: !!thickness },
    evidence: {
      outerDiameter: diameter?.evidence ?? outer, thickness: thickness?.evidence ?? outer, innerDiameter: bore,
      holeCount: holes, holeDiameter: holes, startAngle: holes, pitchCircleDiameter: holes,
    },
  };
}
